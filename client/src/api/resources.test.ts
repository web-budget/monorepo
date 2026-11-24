import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { InternalAxiosRequestConfig } from 'axios'
import { apiClient } from './client'
import { accountsApi } from './accounts'
import { authApi } from './auth'
import { cardsApi } from './cards'
import { classificationsApi } from './classifications'
import { costCentersApi } from './costCenters'
import { financialPeriodsApi } from './financialPeriods'
import { walletsApi } from './wallets'

interface CrudResource {
  findAll(query: object): Promise<unknown>
  findById(id: string): Promise<unknown>
  create(form: object): Promise<string>
  update(id: string, form: object): Promise<unknown>
  remove(id: string): Promise<void>
}

const originalAdapter = apiClient.defaults.adapter
let requests: InternalAxiosRequestConfig[]

beforeEach(() => {
  requests = []
  apiClient.defaults.adapter = (config) => {
    requests.push(config)
    return Promise.resolve({
      data: { served: true },
      status: 200,
      statusText: 'OK',
      headers: { location: 'http://localhost/private/v1/resource/new-id' },
      config,
    })
  }
})

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
})

function lastRequest() {
  const request = requests[requests.length - 1] as InternalAxiosRequestConfig
  return {
    method: request.method,
    url: request.url,
    params: request.params as unknown,
    data: typeof request.data === 'string' ? (JSON.parse(request.data) as unknown) : undefined,
  }
}

describe('authApi', () => {
  it('logs in with a JSON body and reads a 200 as a session', async () => {
    await expect(authApi.login({ email: 'a@b.c', password: 'secret' })).resolves.toEqual({
      kind: 'authenticated',
      session: { served: true },
    })
    expect(lastRequest()).toMatchObject({
      method: 'post',
      url: '/auth/login',
      data: { email: 'a@b.c', password: 'secret' },
    })
  })

  it.each([
    ['needs_enrollment', { kind: 'needs_enrollment' }],
    ['needs_totp', { kind: 'needs_totp' }],
  ])('reads a 202 %s as a pending step', async (status, outcome) => {
    apiClient.defaults.adapter = (config) =>
      Promise.resolve({
        data: { status },
        status: 202,
        statusText: 'Accepted',
        headers: {},
        config,
      })

    await expect(authApi.login({ email: 'a@b.c', password: 'secret' })).resolves.toEqual(outcome)
    await expect(authApi.linkGoogle({ linkToken: 't', password: 'secret' })).resolves.toEqual(
      outcome,
    )
  })

  it('links a Google account', async () => {
    await expect(
      authApi.linkGoogle({ linkToken: 't', password: 'secret', totpCode: '123456' }),
    ).resolves.toEqual({ kind: 'authenticated', session: { served: true } })
    expect(lastRequest()).toMatchObject({
      method: 'post',
      url: '/auth/google/link',
      data: { linkToken: 't', password: 'secret', totpCode: '123456' },
    })
  })

  it('registers an account', async () => {
    const request = { name: 'Ana', email: 'a@b.c', password: 'Secret123' }

    await expect(authApi.register(request)).resolves.toBeUndefined()
    expect(lastRequest()).toMatchObject({ method: 'post', url: '/auth/register', data: request })
  })

  it('enrolls and verifies the TOTP', async () => {
    await expect(authApi.enrollTotp({ email: 'a@b.c', password: 'p' })).resolves.toEqual({
      served: true,
    })
    expect(lastRequest()).toMatchObject({ method: 'post', url: '/auth/totp/enroll' })
    await expect(
      authApi.verifyTotp({ email: 'a@b.c', password: 'p', code: '123456' }),
    ).resolves.toEqual({ served: true })
    expect(lastRequest()).toMatchObject({
      method: 'post',
      url: '/auth/totp/verify',
      data: { email: 'a@b.c', password: 'p', code: '123456' },
    })
  })

  it('lists and revokes the trusted devices', async () => {
    await expect(authApi.findTrustedDevices()).resolves.toEqual({ served: true })
    expect(lastRequest()).toMatchObject({ method: 'get', url: '/auth/trusted-devices' })
    await expect(authApi.revokeTrustedDevice('d-1')).resolves.toBeUndefined()
    expect(lastRequest()).toMatchObject({ method: 'delete', url: '/auth/trusted-devices/d-1' })
    await expect(authApi.revokeAllTrustedDevices()).resolves.toBeUndefined()
    expect(lastRequest()).toMatchObject({ method: 'delete', url: '/auth/trusted-devices' })
  })

  it('fetches the current session', async () => {
    await expect(authApi.fetchSession()).resolves.toEqual({ served: true })
    expect(lastRequest()).toMatchObject({ method: 'get', url: '/auth/session' })
  })

  it('logs out', async () => {
    await expect(authApi.logout()).resolves.toBeUndefined()
    expect(lastRequest()).toMatchObject({ method: 'post', url: '/auth/logout' })
  })
})

describe('accountsApi', () => {
  it('activates an account', async () => {
    const form = { token: 't', email: 'a@b.c' }

    await expect(accountsApi.activate(form)).resolves.toBeUndefined()
    expect(lastRequest()).toMatchObject({ method: 'patch', url: '/accounts/activate', data: form })
  })

  it('requests a password recovery', async () => {
    const form = { email: 'a@b.c' }

    await expect(accountsApi.forgotPassword(form)).resolves.toBeUndefined()
    expect(lastRequest()).toMatchObject({
      method: 'patch',
      url: '/accounts/forgot-password',
      data: form,
    })
  })

  it('recovers a password', async () => {
    const form = { token: 't', email: 'a@b.c', password: 'p' }

    await expect(accountsApi.recoverPassword(form)).resolves.toBeUndefined()
    expect(lastRequest()).toMatchObject({
      method: 'patch',
      url: '/accounts/recover-password',
      data: form,
    })
  })
})

describe.each([
  ['walletsApi', walletsApi as unknown as CrudResource, '/registration/wallets'],
  ['cardsApi', cardsApi as unknown as CrudResource, '/registration/cards'],
  ['costCentersApi', costCentersApi as unknown as CrudResource, '/registration/cost-centers'],
  [
    'classificationsApi',
    classificationsApi as unknown as CrudResource,
    '/registration/classifications',
  ],
  [
    'financialPeriodsApi',
    financialPeriodsApi as unknown as CrudResource,
    '/financial/financial-periods',
  ],
])('%s', (_name, resource, path) => {
  it('lists a page with the query as parameters', async () => {
    const query = { filter: 'x', status: 'ACTIVE', page: 1, size: 15, sort: 'name,asc' }

    await expect(resource.findAll(query)).resolves.toEqual({ served: true })
    expect(lastRequest()).toMatchObject({ method: 'get', url: path, params: query })
  })

  it('finds one by id', async () => {
    await expect(resource.findById('id-1')).resolves.toEqual({ served: true })
    expect(lastRequest()).toMatchObject({ method: 'get', url: `${path}/id-1` })
  })

  it('creates and returns the id from the location header', async () => {
    await expect(resource.create({ name: 'New' })).resolves.toBe('new-id')
    expect(lastRequest()).toMatchObject({ method: 'post', url: path, data: { name: 'New' } })
  })

  it('updates and returns the view', async () => {
    await expect(resource.update('id-1', { name: 'Edited' })).resolves.toEqual({ served: true })
    expect(lastRequest()).toMatchObject({
      method: 'put',
      url: `${path}/id-1`,
      data: { name: 'Edited' },
    })
  })

  it('removes by id', async () => {
    await expect(resource.remove('id-1')).resolves.toBeUndefined()
    expect(lastRequest()).toMatchObject({ method: 'delete', url: `${path}/id-1` })
  })
})
