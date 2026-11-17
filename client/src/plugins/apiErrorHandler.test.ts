import { createTestingPinia } from '@pinia/testing'
import axios, { AxiosError, CanceledError, type AxiosInstance } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { toApiError } from '@/api/client'
import { installApiErrorHandler } from '@/plugins/apiErrorHandler'
import { useAuthStore } from '@/stores/auth'

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

type Failure = { status: number; data?: unknown } | 'network' | 'canceled'

function createRouterAt() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/private', component: { render: () => h('div') } },
      {
        path: '/error/forbidden',
        name: '403',
        meta: { public: true },
        component: { render: () => h('div') },
      },
      {
        path: '/login',
        name: 'login',
        meta: { public: true },
        component: { render: () => h('div') },
      },
    ],
  })
}

function createClient(failure: Failure, router: ReturnType<typeof createRouterAt>): AxiosInstance {
  const client = axios.create({
    adapter: (config) => {
      if (failure === 'canceled') {
        return Promise.reject(new CanceledError())
      }
      if (failure === 'network') {
        return Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK', config))
      }
      return Promise.reject(
        new AxiosError('failed', 'ERR_BAD_RESPONSE', config, null, {
          status: failure.status,
          data: failure.data,
          statusText: '',
          headers: {},
          config,
        }),
      )
    },
  })
  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => Promise.reject(toApiError(error)),
  )
  installApiErrorHandler(client, router)
  return client
}

describe('installApiErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createTestingPinia({ createSpy: vi.fn })
  })

  it('clears the session and sends an unauthenticated user to the login with the redirect', async () => {
    const router = createRouterAt()
    await router.push('/private')
    const client = createClient({ status: 401 }, router)

    await expect(client.get('/x')).rejects.toMatchObject({ status: 401 })

    expect(useAuthStore().clearSession).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/private')
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('expires the session of an authenticated user whose request is answered with a 401', async () => {
    const router = createRouterAt()
    await router.push('/private')
    const auth = useAuthStore()
    auth.session = { name: 'Ana', email: 'ana@example.com', status: 'APPROVED', roles: [] }
    const client = createClient({ status: 401, data: { error: 'session-revoked' } }, router)

    await expect(client.get('/x')).rejects.toMatchObject({ status: 401 })

    expect(auth.expireSession).toHaveBeenCalledExactlyOnceWith('expired')
    expect(auth.clearSession).not.toHaveBeenCalled()
    expect(router.currentRoute.value.fullPath).toBe('/private')
  })

  it.each(['invalid-credentials', 'account-disabled'])(
    'leaves a login rejected with %s to the login screen',
    async (error) => {
      const router = createRouterAt()
      await router.push('/private')
      const auth = useAuthStore()
      const client = createClient({ status: 401, data: { error } }, router)

      await expect(client.post('/auth/login')).rejects.toMatchObject({ status: 401, error })

      expect(auth.expireSession).not.toHaveBeenCalled()
      expect(auth.clearSession).not.toHaveBeenCalled()
      expect(router.currentRoute.value.fullPath).toBe('/private')
    },
  )

  it('sends the user to the forbidden page when the server refuses the role', async () => {
    const router = createRouterAt()
    await router.push('/private')
    const client = createClient({ status: 403, data: { error: 'forbidden' } }, router)

    await expect(client.get('/x')).rejects.toMatchObject({ status: 403 })

    expect(router.currentRoute.value.name).toBe('403')
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('leaves a pending approval to its own screen', async () => {
    const router = createRouterAt()
    await router.push('/private')
    const client = createClient({ status: 403, data: { error: 'pending_approval' } }, router)

    await expect(client.get('/x')).rejects.toMatchObject({ status: 403 })

    expect(router.currentRoute.value.fullPath).toBe('/private')
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('tells the user when the server rejects the CSRF token', async () => {
    const router = createRouterAt()
    await router.push('/private')
    const client = createClient({ status: 403, data: { error: 'invalid-csrf-token' } }, router)

    await expect(client.post('/x')).rejects.toMatchObject({ status: 403 })

    expect(toast.error).toHaveBeenCalledWith('Requisição não autorizada', expect.anything())
    expect(router.currentRoute.value.fullPath).toBe('/private')
  })

  it('stays on a public route after a 401', async () => {
    const router = createRouterAt()
    await router.push('/login')
    const client = createClient({ status: 401 }, router)

    await expect(client.get('/x')).rejects.toMatchObject({ status: 401 })

    expect(useAuthStore().clearSession).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.fullPath).toBe('/login')
  })

  it('shows no toast for a 403, which is a matter of navigation', async () => {
    const router = createRouterAt()
    const client = createClient({ status: 403 }, router)

    await expect(client.get('/x')).rejects.toMatchObject({ status: 403 })

    expect(toast.warning).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('shows a warning toast for a not found', async () => {
    const router = createRouterAt()
    const client = createClient({ status: 404 }, router)

    await expect(client.get('/x')).rejects.toMatchObject({ status: 404 })

    expect(toast.warning).toHaveBeenCalledTimes(1)
  })

  it('shows an error toast when the server cannot be reached', async () => {
    const router = createRouterAt()
    const client = createClient('network', router)

    await expect(client.get('/x')).rejects.toMatchObject({ status: null })

    expect(toast.error).toHaveBeenCalledWith(
      'Falha na conexão',
      expect.objectContaining({ description: expect.any(String) }),
    )
  })

  it('stays quiet for a request that opted out with silent', async () => {
    const router = createRouterAt()
    const client = createClient({ status: 500 }, router)

    await expect(client.get('/x', { silent: true })).rejects.toMatchObject({ status: 500 })

    expect(toast.error).not.toHaveBeenCalled()
  })

  it('lets a cancelled request through untouched', async () => {
    const router = createRouterAt()
    const client = createClient('canceled', router)

    await expect(client.get('/x')).rejects.toBeInstanceOf(CanceledError)

    expect(toast.error).not.toHaveBeenCalled()
  })
})
