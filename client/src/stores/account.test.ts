import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { accountsApi } from '@/api/accounts'
import { ApiError } from '@/api/client'
import { useAccountStore } from './account'

vi.mock('@/api/accounts')

describe('useAccountStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('activates an account', async () => {
    vi.mocked(accountsApi.activate).mockResolvedValue()
    const store = useAccountStore()

    await store.activate({ token: 't', email: 'a@b.c' })

    expect(accountsApi.activate).toHaveBeenCalledWith({ token: 't', email: 'a@b.c' })
  })

  it('requests a password recovery', async () => {
    vi.mocked(accountsApi.forgotPassword).mockResolvedValue()
    const store = useAccountStore()

    await store.forgotPassword({ email: 'a@b.c' })

    expect(accountsApi.forgotPassword).toHaveBeenCalledWith({ email: 'a@b.c' })
  })

  it('recovers a password', async () => {
    vi.mocked(accountsApi.recoverPassword).mockResolvedValue()
    const store = useAccountStore()

    await store.recoverPassword({ token: 't', email: 'a@b.c', password: 'new' })

    expect(accountsApi.recoverPassword).toHaveBeenCalledWith({
      token: 't',
      email: 'a@b.c',
      password: 'new',
    })
  })

  it('reports loading while a request is in flight', async () => {
    let resolve!: () => void
    vi.mocked(accountsApi.activate).mockReturnValue(new Promise((done) => (resolve = done)))
    const store = useAccountStore()

    const activating = store.activate({ token: 't', email: 'a@b.c' })
    expect(store.loading).toBe(true)

    resolve()
    await activating
    expect(store.loading).toBe(false)
  })

  it('rethrows a rejected token and stops loading', async () => {
    const failure = new ApiError({ error: 'invalid-token' }, 400)
    vi.mocked(accountsApi.recoverPassword).mockRejectedValue(failure)
    const store = useAccountStore()

    await expect(
      store.recoverPassword({ token: 't', email: 'a@b.c', password: 'new' }),
    ).rejects.toBe(failure)
    expect(store.loading).toBe(false)
  })

  it('reset() clears the loading flag', () => {
    vi.mocked(accountsApi.activate).mockReturnValue(new Promise(() => undefined))
    const store = useAccountStore()
    void store.activate({ token: 't', email: 'a@b.c' })

    store.reset()

    expect(store.loading).toBe(false)
  })
})
