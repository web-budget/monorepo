import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { authApi } from '@/api/auth'
import { ApiError } from '@/api/client'
import { resetUserStores } from '@/stores/resetUserStores'
import type { SessionResponse } from '@/types'
import { useAuthStore } from './auth'

vi.mock('@/api/auth')
vi.mock('@/stores/resetUserStores')

const session: SessionResponse = {
  name: 'Admin',
  email: 'admin@webbudget.com.br',
  status: 'APPROVED',
  roles: ['ADMINISTRATION', 'REGISTRATION'],
}

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('starts without a session', () => {
    const store = useAuthStore()

    expect(store.session).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(store.loading).toBe(false)
  })

  it('login() keeps the session the server answers with', async () => {
    vi.mocked(authApi.login).mockResolvedValue(session)
    const store = useAuthStore()

    await expect(store.login({ email: session.email, password: 'secret' })).resolves.toEqual(
      session,
    )

    expect(authApi.login).toHaveBeenCalledWith({ email: session.email, password: 'secret' })
    expect(store.session).toEqual(session)
    expect(store.isAuthenticated).toBe(true)
  })

  it('login() reports loading while the request is in flight', async () => {
    let resolve!: (value: SessionResponse) => void
    vi.mocked(authApi.login).mockReturnValue(new Promise((done) => (resolve = done)))
    const store = useAuthStore()

    const logging = store.login({ email: session.email, password: 'secret' })
    expect(store.loading).toBe(true)

    resolve(session)
    await logging
    expect(store.loading).toBe(false)
  })

  it('login() rethrows bad credentials without a session', async () => {
    const failure = new ApiError({ error: 'invalid_credentials' }, 401)
    vi.mocked(authApi.login).mockRejectedValue(failure)
    const store = useAuthStore()

    await expect(store.login({ email: session.email, password: 'wrong' })).rejects.toBe(failure)
    expect(store.session).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('restoreSession() keeps the session the server still holds', async () => {
    vi.mocked(authApi.fetchSession).mockResolvedValue(session)
    const store = useAuthStore()

    await expect(store.restoreSession()).resolves.toBe(true)
    expect(store.session).toEqual(session)
    expect(store.loading).toBe(false)
  })

  it('restoreSession() settles on no session when the server has none', async () => {
    vi.mocked(authApi.fetchSession).mockRejectedValue(new ApiError(null, 401))
    const store = useAuthStore()

    await expect(store.restoreSession()).resolves.toBe(false)
    expect(store.session).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('logout() ends the session and clears the user stores', async () => {
    vi.mocked(authApi.login).mockResolvedValue(session)
    vi.mocked(authApi.logout).mockResolvedValue()
    const store = useAuthStore()
    await store.login({ email: session.email, password: 'secret' })

    await store.logout()

    expect(authApi.logout).toHaveBeenCalled()
    expect(store.session).toBeNull()
    expect(resetUserStores).toHaveBeenCalledOnce()
  })

  it('logout() clears the local session even when the server call fails', async () => {
    const failure = new ApiError(null, null)
    vi.mocked(authApi.login).mockResolvedValue(session)
    vi.mocked(authApi.logout).mockRejectedValue(failure)
    const store = useAuthStore()
    await store.login({ email: session.email, password: 'secret' })

    await expect(store.logout()).rejects.toBe(failure)

    expect(store.session).toBeNull()
    expect(resetUserStores).toHaveBeenCalledOnce()
  })

  it('clearSession() drops the session without calling the server', async () => {
    vi.mocked(authApi.login).mockResolvedValue(session)
    const store = useAuthStore()
    await store.login({ email: session.email, password: 'secret' })

    store.clearSession()

    expect(authApi.logout).not.toHaveBeenCalled()
    expect(store.session).toBeNull()
    expect(resetUserStores).toHaveBeenCalledOnce()
  })
})
