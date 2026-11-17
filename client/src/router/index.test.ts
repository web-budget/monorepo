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

    expect(loaders).toHaveLength(25)
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

describe('registration crud routes', () => {
  it.each([
    ['wallets', 'wallet'],
    ['cards', 'card'],
    ['cost-centers', 'cost-center'],
    ['classifications', 'classification'],
    ['financial-periods', 'financial-period'],
  ])('registers the list, create, update and detail routes of %s', (name, entity) => {
    const base = `/registration/${name}`

    expect(router.resolve(base).name).toBe(name)
    expect(router.resolve(`${base}/create`).name).toBe(`${name}.create`)
    expect(router.resolve(`${base}/abc/update`).name).toBe(`${name}.update`)
    expect(router.resolve(`${base}/abc/detail`).name).toBe(`${name}.detail`)
    expect(router.resolve(`${base}/abc/update`).params.id).toBe('abc')
    expect(
      router.resolve(`${base}/create`).matched.map((record) => record.meta.breadcrumb),
    ).toEqual(['menu.registration', `${entity}.menu`, `${entity}.form.new`])
    for (const [route, label] of [
      ['update', 'editing'],
      ['detail', 'detailing'],
    ] as const) {
      const crumbs = router
        .resolve(`${base}/abc/${route}`)
        .matched.map((record) => record.meta.breadcrumb)
      expect(crumbs).toEqual(['menu.registration', `${entity}.menu`, `${entity}.form.${label}`])
    }
  })

  it('passes the id to the update and detail views but not to the list', () => {
    const records = router.getRoutes()
    const update = records.find((record) => record.name === 'wallets.update')
    const list = records.find((record) => record.name === 'wallets')

    expect(update?.props.default).toBe(true)
    expect(list?.props.default).toBeFalsy()
  })
})
