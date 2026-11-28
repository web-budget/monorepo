import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { authApi } from '@/api/auth'
import { ApiError } from '@/api/client'
import router from '@/router'
import { resetUserStores } from '@/stores/resetUserStores'
import type { LoginOutcome, SessionResponse } from '@/types'
import { useAuthStore } from './auth'

vi.mock('@/api/auth')
vi.mock('@/stores/resetUserStores')
vi.mock('@/router', () => ({
  default: {
    currentRoute: { value: { fullPath: '/registration/wallets?page=2', matched: [{ meta: {} }] } },
    replace: vi.fn<() => Promise<void>>(),
  },
}))

const session: SessionResponse = {
  name: 'Admin',
  email: 'admin@webbudget.com.br',
  status: 'APPROVED',
  language: 'PT_BR',
  dueDateNotices: true,
  hasPassword: true,
  googleLinked: false,
  totpEnabled: false,
  totpRequired: false,
  roles: ['ADMINISTRATION', 'REGISTRATION'],
}

const credentials = { email: session.email, password: 'secret' }

async function authenticatedStore() {
  vi.mocked(authApi.login).mockResolvedValue({ kind: 'authenticated', session })
  const store = useAuthStore()
  await store.login(credentials)
  vi.clearAllMocks()
  return store
}

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    vi.mocked(router.replace).mockResolvedValue(undefined)
    vi.mocked(authApi.logout).mockResolvedValue()
    router.currentRoute.value.fullPath = '/registration/wallets?page=2'
    router.currentRoute.value.matched = [{ meta: {} }] as never
  })

  it('starts without a session', () => {
    const store = useAuthStore()

    expect(store.session).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(store.loading).toBe(false)
    expect(store.endingSession).toBe(false)
  })

  it('login() keeps the session the server answers with', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ kind: 'authenticated', session })
    const store = useAuthStore()

    await expect(store.login(credentials)).resolves.toEqual({ kind: 'authenticated', session })

    expect(authApi.login).toHaveBeenCalledWith(credentials)
    expect(store.session).toEqual(session)
    expect(store.isAuthenticated).toBe(true)
  })

  it('login() clears the user stores before it keeps the new session', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ kind: 'authenticated', session })
    const store = useAuthStore()
    vi.mocked(resetUserStores).mockImplementation(() => expect(store.session).toBeNull())

    await store.login(credentials)

    expect(resetUserStores).toHaveBeenCalledOnce()
  })

  it('login() reports loading while the request is in flight', async () => {
    let resolve!: (value: LoginOutcome) => void
    vi.mocked(authApi.login).mockReturnValue(new Promise((done) => (resolve = done)))
    const store = useAuthStore()

    const logging = store.login(credentials)
    expect(store.loading).toBe(true)

    resolve({ kind: 'authenticated', session })
    await logging
    expect(store.loading).toBe(false)
  })

  it('login() rethrows bad credentials without a session and keeps the user stores', async () => {
    const failure = new ApiError({ error: 'invalid-credentials' }, 401)
    vi.mocked(authApi.login).mockRejectedValue(failure)
    const store = useAuthStore()

    await expect(store.login({ ...credentials, password: 'wrong' })).rejects.toBe(failure)
    expect(store.session).toBeNull()
    expect(store.loading).toBe(false)
    expect(resetUserStores).not.toHaveBeenCalled()
  })

  it('changeLanguage() keeps the session the server answers with', async () => {
    const store = await authenticatedStore()
    vi.mocked(authApi.changeLanguage).mockResolvedValue({ ...session, language: 'EN_US' })

    await store.changeLanguage('EN_US')

    expect(authApi.changeLanguage).toHaveBeenCalledWith('EN_US')
    expect(store.session).toEqual({ ...session, language: 'EN_US' })
  })

  it('changeDueDateNotices() keeps the session the server answers with', async () => {
    const store = await authenticatedStore()
    vi.mocked(authApi.updateDueDateNotices).mockResolvedValue({
      ...session,
      dueDateNotices: false,
    })

    await store.changeDueDateNotices(false)

    expect(authApi.updateDueDateNotices).toHaveBeenCalledWith(false)
    expect(store.session?.dueDateNotices).toBe(false)
  })

  it('changeLanguage() keeps the session as it was when the server refuses', async () => {
    const store = await authenticatedStore()
    const failure = new ApiError({ error: 'field-validation-failed' }, 422)
    vi.mocked(authApi.changeLanguage).mockRejectedValue(failure)

    await expect(store.changeLanguage('EN_US')).rejects.toBe(failure)

    expect(store.session).toEqual(session)
  })

  it('changeName() keeps the session the server answers with', async () => {
    const store = await authenticatedStore()
    vi.mocked(authApi.changeName).mockResolvedValue({ ...session, name: 'Maria' })

    await store.changeName('Maria')

    expect(authApi.changeName).toHaveBeenCalledWith('Maria')
    expect(store.session).toEqual({ ...session, name: 'Maria' })
  })

  it('changeName() keeps the session as it was when the server refuses', async () => {
    const store = await authenticatedStore()
    const failure = new ApiError({ error: 'field-validation-failed' }, 422)
    vi.mocked(authApi.changeName).mockRejectedValue(failure)

    await expect(store.changeName('Maria')).rejects.toBe(failure)

    expect(store.session).toEqual(session)
  })

  it('changePassword() hands the passwords over and keeps the session', async () => {
    const store = await authenticatedStore()
    vi.mocked(authApi.changePassword).mockResolvedValue()

    await store.changePassword({ currentPassword: 'old', newPassword: 'New1password' })

    expect(authApi.changePassword).toHaveBeenCalledWith({
      currentPassword: 'old',
      newPassword: 'New1password',
    })
    expect(store.session).toEqual(session)
  })

  it('changePassword() rethrows the refusal of the server', async () => {
    const store = await authenticatedStore()
    const failure = new ApiError({ error: 'invalid_current_password' }, 400)
    vi.mocked(authApi.changePassword).mockRejectedValue(failure)

    await expect(
      store.changePassword({ currentPassword: 'wrong', newPassword: 'New1password' }),
    ).rejects.toBe(failure)
  })

  it('hasRole() is true only for a role of the session', async () => {
    const store = useAuthStore()
    expect(store.hasRole('REGISTRATION')).toBe(false)

    await authenticatedStore()
    vi.mocked(authApi.login).mockResolvedValue({ kind: 'authenticated', session })
    await store.login(credentials)

    expect(store.hasRole('REGISTRATION')).toBe(true)
    expect(store.hasRole('FINANCIAL')).toBe(false)
  })

  it('restoreSession() keeps the session the server still holds', async () => {
    vi.mocked(authApi.fetchSession).mockResolvedValue(session)
    const store = useAuthStore()

    await expect(store.restoreSession()).resolves.toBe(true)
    expect(store.session).toEqual(session)
    expect(store.loading).toBe(false)
    expect(resetUserStores).not.toHaveBeenCalled()
  })

  it('restoreSession() settles on no session and clears the user stores when the server has none', async () => {
    vi.mocked(authApi.fetchSession).mockRejectedValue(new ApiError(null, 401))
    const store = useAuthStore()

    await expect(store.restoreSession()).resolves.toBe(false)
    expect(store.session).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.sessionUnavailable).toBe(false)
    expect(resetUserStores).toHaveBeenCalledOnce()
  })

  it.each([
    ['a network failure', new ApiError(null, null)],
    ['a 500', new ApiError(null, 500)],
    ['a 503', new ApiError(null, 503)],
  ])(
    'restoreSession() reports the session as unavailable, not as ended, on %s',
    async (_name, failure) => {
      vi.mocked(authApi.fetchSession).mockRejectedValue(failure)
      const store = useAuthStore()

      await expect(store.restoreSession()).resolves.toBe(false)
      expect(store.sessionUnavailable).toBe(true)
      expect(store.restoringSession).toBe(false)
      expect(store.loading).toBe(false)
      expect(resetUserStores).not.toHaveBeenCalled()
    },
  )

  it.each([
    ['a 403', new ApiError(null, 403)],
    ['an unexpected error', new Error('boom')],
  ])('restoreSession() treats %s as no session', async (_name, failure) => {
    vi.mocked(authApi.fetchSession).mockRejectedValue(failure)
    const store = useAuthStore()

    await expect(store.restoreSession()).resolves.toBe(false)
    expect(store.sessionUnavailable).toBe(false)
    expect(resetUserStores).toHaveBeenCalledOnce()
  })

  it('restoreSession() forgets an earlier outage when the next attempt works', async () => {
    vi.mocked(authApi.fetchSession).mockRejectedValueOnce(new ApiError(null, null))
    vi.mocked(authApi.fetchSession).mockResolvedValueOnce(session)
    const store = useAuthStore()

    await store.restoreSession()
    await expect(store.restoreSession()).resolves.toBe(true)
    expect(store.sessionUnavailable).toBe(false)
  })

  it('restoreSession() flags the restoration while the request is in flight', async () => {
    let finish: (value: SessionResponse) => void = () => undefined
    vi.mocked(authApi.fetchSession).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const store = useAuthStore()

    const restoring = store.restoreSession()
    expect(store.restoringSession).toBe(true)
    finish(session)
    await restoring

    expect(store.restoringSession).toBe(false)
  })

  it('logout() goes to the login first and only then clears the session and the user stores', async () => {
    const store = await authenticatedStore()
    vi.mocked(router.replace).mockImplementation(() => {
      expect(store.session).toEqual(session)
      expect(store.endingSession).toBe(true)
      expect(resetUserStores).not.toHaveBeenCalled()
      return Promise.resolve(undefined)
    })

    await store.logout()

    expect(authApi.logout).toHaveBeenCalledWith()
    expect(router.replace).toHaveBeenCalledWith({ name: 'login', query: {} })
    expect(store.session).toBeNull()
    expect(store.endingSession).toBe(false)
    expect(resetUserStores).toHaveBeenCalledOnce()
  })

  it('logout() ends the local session even when the server call fails', async () => {
    const failure = new ApiError(null, null)
    const store = await authenticatedStore()
    vi.mocked(authApi.logout).mockRejectedValue(failure)

    await expect(store.logout()).rejects.toBe(failure)

    expect(router.replace).toHaveBeenCalledWith({ name: 'login', query: {} })
    expect(store.session).toBeNull()
    expect(resetUserStores).toHaveBeenCalledOnce()
  })

  it('clearSession() drops the session without calling the server', async () => {
    const store = await authenticatedStore()

    store.clearSession()

    expect(authApi.logout).not.toHaveBeenCalled()
    expect(router.replace).not.toHaveBeenCalled()
    expect(store.session).toBeNull()
    expect(resetUserStores).toHaveBeenCalledOnce()
  })

  it.each(['expired', 'inactivity'] as const)(
    'expireSession(%s) sends the user to the login with the reason and the page to come back to',
    async (reason) => {
      const store = await authenticatedStore()

      await store.expireSession(reason)

      expect(authApi.logout).toHaveBeenCalledWith({ silent: true })
      expect(router.replace).toHaveBeenCalledWith({
        name: 'login',
        query: { reason, redirect: '/registration/wallets?page=2' },
      })
      expect(store.session).toBeNull()
      expect(store.endingSession).toBe(false)
      expect(resetUserStores).toHaveBeenCalledOnce()
    },
  )

  it('expireSession() does not ask to come back to a public page', async () => {
    const store = await authenticatedStore()
    router.currentRoute.value.matched = [{ meta: { public: true } }] as never

    await store.expireSession('expired')

    expect(router.replace).toHaveBeenCalledWith({ name: 'login', query: { reason: 'expired' } })
  })

  it('expireSession() ignores a failure of the server logout', async () => {
    const store = await authenticatedStore()
    vi.mocked(authApi.logout).mockRejectedValue(new ApiError(null, 401))

    await store.expireSession('expired')

    expect(store.session).toBeNull()
  })

  it('expireSession() does nothing without a session', async () => {
    const store = useAuthStore()

    await store.expireSession('expired')

    expect(authApi.logout).not.toHaveBeenCalled()
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('expireSession() does not run twice while the session is ending', async () => {
    const store = await authenticatedStore()
    let finish!: () => void
    vi.mocked(router.replace).mockReturnValue(
      new Promise((done) => (finish = () => done(undefined))),
    )

    const first = store.expireSession('expired')
    await store.expireSession('inactivity')
    finish()
    await first

    expect(router.replace).toHaveBeenCalledTimes(1)
    expect(authApi.logout).toHaveBeenCalledTimes(1)
  })

  it('login() keeps no session while the server still asks for the TOTP', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ kind: 'needs_totp' })
    const store = useAuthStore()

    await expect(store.login(credentials)).resolves.toEqual({ kind: 'needs_totp' })

    expect(store.session).toBeNull()
    expect(resetUserStores).not.toHaveBeenCalled()
  })

  it('isApproved is true only for an approved session', () => {
    const store = useAuthStore()
    expect(store.isApproved).toBe(false)

    store.session = { ...session, status: 'PENDING' }
    expect(store.isApproved).toBe(false)

    store.session = session
    expect(store.isApproved).toBe(true)
  })

  it('linkGoogle() opens the session once the link is done', async () => {
    vi.mocked(authApi.linkGoogle).mockResolvedValue({ kind: 'authenticated', session })
    const store = useAuthStore()

    await expect(store.linkGoogle({ linkToken: 't', password: 'p' })).resolves.toEqual({
      kind: 'authenticated',
      session,
    })

    expect(store.session).toEqual(session)
    expect(store.loading).toBe(false)
  })

  it('linkGoogle() keeps no session while it asks for the TOTP, and when it fails', async () => {
    const store = useAuthStore()
    vi.mocked(authApi.linkGoogle).mockResolvedValueOnce({ kind: 'needs_totp' })
    await store.linkGoogle({ linkToken: 't', password: 'p' })
    expect(store.session).toBeNull()

    vi.mocked(authApi.linkGoogle).mockRejectedValueOnce(new ApiError(null, 401))
    await expect(store.linkGoogle({ linkToken: 't', password: 'p' })).rejects.toBeInstanceOf(
      ApiError,
    )
    expect(store.session).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('register() remembers the e-mail for the approval screen until the session changes', async () => {
    vi.mocked(authApi.register).mockResolvedValue()
    const store = useAuthStore()
    const request = { name: 'Ana', email: 'ana@example.com', password: 'Caderno1' }

    await store.register(request)

    expect(authApi.register).toHaveBeenCalledWith(request)
    expect(store.registeredEmail).toBe('ana@example.com')
    expect(store.isAuthenticated).toBe(false)

    store.clearSession()
    expect(store.registeredEmail).toBeNull()
  })

  it('register() remembers nothing when the server refuses', async () => {
    vi.mocked(authApi.register).mockRejectedValue(new ApiError(null, 429))
    const store = useAuthStore()

    await expect(
      store.register({ name: 'Ana', email: 'ana@example.com', password: 'Caderno1' }),
    ).rejects.toBeInstanceOf(ApiError)

    expect(store.registeredEmail).toBeNull()
  })

  it('enrollTotp() hands the QR code over without opening a session', async () => {
    const enrollment = { secretKey: 'ABCD', qrCodeDataUri: 'data:image/png;base64,AAA' }
    vi.mocked(authApi.enrollTotp).mockResolvedValue(enrollment)
    const store = useAuthStore()

    await expect(store.enrollTotp(credentials)).resolves.toEqual(enrollment)

    expect(store.session).toBeNull()
  })

  it('verifyTotp() opens the session and forgets the registration', async () => {
    vi.mocked(authApi.verifyTotp).mockResolvedValue(session)
    const store = useAuthStore()
    store.registeredEmail = 'old@example.com'

    await expect(store.verifyTotp({ ...credentials, code: '123456' })).resolves.toEqual(session)

    expect(store.session).toEqual(session)
    expect(store.registeredEmail).toBeNull()
    expect(resetUserStores).toHaveBeenCalledOnce()
    expect(store.loading).toBe(false)
  })

  it('verifyTotp() rethrows a wrong code and stays without a session', async () => {
    vi.mocked(authApi.verifyTotp).mockRejectedValue(
      new ApiError({ error: 'invalid_totp_code' }, 401),
    )
    const store = useAuthStore()

    await expect(store.verifyTotp({ ...credentials, code: '000000' })).rejects.toBeInstanceOf(
      ApiError,
    )

    expect(store.session).toBeNull()
    expect(store.loading).toBe(false)
  })
})
