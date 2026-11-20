import { describe, expect, it } from 'vitest'
import router from '@/router'
import { isPublicRoute } from '@/router/publicRoutes'

describe('router', () => {
  it('uses HTML5 history rooted at the app base URL', () => {
    expect(router.options.history.base).toBe('')
    expect(router.options.history.location).toBe('/')
  })

  it('registers the start, login and section routes', () => {
    const names = router.getRoutes().map((record) => record.name)

    expect(names).toEqual(
      expect.arrayContaining([
        'start',
        'login',
        'dashboards',
        'registration',
        'financial',
        'configuration',
      ]),
    )
  })

  it('loads every lazy view', async () => {
    const loaders = router
      .getRoutes()
      .map((record) => record.components?.default)
      .filter((component) => typeof component === 'function')

    expect(loaders).toHaveLength(40)
    for (const loader of loaders) {
      expect(await (loader as () => Promise<unknown>)()).toHaveProperty('default')
    }
  })

  it('treats the authentication and error screens as public', () => {
    for (const path of [
      '/login',
      '/auth/forgot-password',
      '/auth/recover-password',
      '/auth/account-activation',
      '/error/forbidden',
      '/error/not-found',
      '/error/server-error',
      '/does-not-exist',
    ]) {
      expect(isPublicRoute(router.resolve(path))).toBe(true)
    }
  })

  it('keeps the application screens private', () => {
    expect(isPublicRoute(router.resolve('/registration'))).toBe(false)
    expect(isPublicRoute(router.resolve('/'))).toBe(false)
  })

  it('names the screens that the e-mail links and the error redirects point to', () => {
    expect(router.resolve('/auth/account-activation?token=a&email=b').name).toBe(
      'account-activation',
    )
    expect(router.resolve('/auth/recover-password').name).toBe('recover-password')
    expect(router.resolve('/error/forbidden').name).toBe('403')
    expect(router.resolve('/does-not-exist').name).toBe('not-found')
  })

  it('nests each section home under its layout with a breadcrumb label', () => {
    expect(router.resolve('/registration').matched.map((record) => record.meta.breadcrumb)).toEqual(
      ['menu.registration', undefined],
    )
    expect(router.resolve('/dashboards').matched[0]?.meta).toMatchObject({
      breadcrumb: 'menu.dashboards',
      role: 'DASHBOARDS',
    })
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

describe('users routes', () => {
  it('registers the list, create and update routes under the configuration section', () => {
    expect(router.resolve('/configuration/users').name).toBe('users')
    expect(router.resolve('/configuration/users/create').name).toBe('users.create')
    expect(router.resolve('/configuration/users/abc/update').name).toBe('users.update')
    expect(router.resolve('/configuration/users/abc/update').params.id).toBe('abc')
  })

  it('asks for the administration role and labels the breadcrumb on every users screen', () => {
    for (const [path, label] of [
      ['/configuration/users', undefined],
      ['/configuration/users/create', 'users.form.new'],
      ['/configuration/users/abc/update', 'users.form.editing'],
    ] as const) {
      const matched = router.resolve(path).matched

      expect(matched.map((record) => record.meta.role)).toContain('ADMINISTRATION')
      expect(matched.map((record) => record.meta.breadcrumb)).toContain('users.menu')
      expect(
        matched
          .map((record) => record.meta.breadcrumb)
          .filter(Boolean)
          .pop(),
      ).toBe(label ?? 'users.menu')
    }
  })
})

describe('role of each section', () => {
  it.each([
    ['/registration', 'REGISTRATION'],
    ['/registration/wallets/create', 'REGISTRATION'],
    ['/financial', 'FINANCIAL'],
    ['/configuration', 'ADMINISTRATION'],
  ])('asks for the role of the area on %s', (path, role) => {
    expect(router.resolve(path).matched.map((record) => record.meta.role)).toContain(role)
  })

  it('asks for no role on the start page nor on the public screens', () => {
    for (const path of ['/', '/login', '/error/forbidden', '/auth/forgot-password']) {
      expect(router.resolve(path).matched.some((record) => record.meta.role !== undefined)).toBe(
        false,
      )
    }
  })
})

describe('content width', () => {
  it.each([
    '/registration/wallets/create',
    '/registration/wallets/abc/update',
    '/registration/wallets/abc/detail',
    '/configuration/users/create',
    '/configuration/users/abc/update',
    '/registration/wallets',
    '/dashboards',
    '/',
  ])('does not limit the width of %s', (path) => {
    expect(Object.keys(router.resolve(path).meta)).not.toContain('narrow')
  })
})

describe('start route', () => {
  it('has its own record, so that the root is never the public catch-all', () => {
    const resolved = router.resolve('/')

    expect(resolved.name).toBe('start')
    expect(resolved.matched).toHaveLength(1)
    expect(isPublicRoute(resolved)).toBe(false)
  })
})

describe('dashboards routes', () => {
  it.each([
    ['/dashboards', 'dashboards', 'overview'],
    ['/dashboards/mes-atual', 'dashboards.current-month', 'current-month'],
    ['/dashboards/meses-anteriores', 'dashboards.previous-months', 'previous-months'],
    ['/dashboards/por-carteira', 'dashboards.by-wallet', 'by-wallet'],
    ['/dashboards/por-classificacao', 'dashboards.by-classification', 'by-classification'],
  ])('registers %s with its breadcrumb and the DASHBOARDS role', (path, name, key) => {
    const resolved = router.resolve(path)

    expect(resolved.name).toBe(name)
    expect(resolved.matched.map((record) => record.meta.breadcrumb)).toEqual([
      'menu.dashboards',
      `dashboards.${key}`,
    ])
    expect(resolved.matched.map((record) => record.meta.role)).toContain('DASHBOARDS')
    expect(router.getRoutes().find((record) => record.name === name)?.props.default).toEqual({
      title: `dashboards.${key}`,
      description: `dashboards.description.${key}`,
    })
  })
})
