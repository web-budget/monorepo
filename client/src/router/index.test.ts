import { describe, expect, it } from 'vitest'
import router from '@/router'
import { isPublicRoute } from '@/router/publicRoutes'

describe('router', () => {
  it('uses HTML5 history rooted at the app base URL', () => {
    expect(router.options.history.base).toBe('')
    expect(router.options.history.location).toBe('/')
  })

  it('registers the home, login and section routes', () => {
    const names = router.getRoutes().map((record) => record.name)

    expect(names).toEqual(
      expect.arrayContaining(['home', 'login', 'registration', 'financial', 'configuration']),
    )
  })

  it('loads every lazy view', async () => {
    const loaders = router
      .getRoutes()
      .map((record) => record.components?.default)
      .filter((component) => typeof component === 'function')

    expect(loaders).toHaveLength(5)
    for (const loader of loaders) {
      expect(await (loader as () => Promise<unknown>)()).toHaveProperty('default')
    }
  })

  it('treats only the login as public', () => {
    expect(isPublicRoute(router.resolve('/login'))).toBe(true)
    expect(isPublicRoute(router.resolve('/registration'))).toBe(false)
    expect(isPublicRoute(router.resolve('/'))).toBe(false)
  })

  it('nests each section home under its layout with a breadcrumb label', () => {
    expect(router.resolve('/registration').matched.map((record) => record.meta.breadcrumb)).toEqual(
      ['menu.registration', undefined],
    )
    expect(router.resolve('/financial').matched[0]?.meta.breadcrumb).toBe('menu.financial')
    expect(router.resolve('/configuration').matched[0]?.meta.breadcrumb).toBe('menu.configuration')
  })
})
