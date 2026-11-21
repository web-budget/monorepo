import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { authApi } from '@/api/auth'
import { ApiError } from '@/api/client'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'
import { useWalletsStore } from '@/stores/wallets'
import type { SessionResponse, WalletListView, WalletView } from '@/types'

vi.mock('@/api/auth')
vi.mock('@/router', () => ({
  default: {
    currentRoute: { value: { fullPath: '/registration/wallets', matched: [{ meta: {} }] } },
    replace: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  },
}))

const session: SessionResponse = {
  name: 'Ana',
  email: 'ana@example.com',
  status: 'APPROVED',
  language: 'PT_BR',
  roles: ['REGISTRATION'],
}

const previousUserWallet: WalletView = {
  id: 'wallet-1',
  name: 'Previous user wallet',
  type: 'PERSONAL',
  currentBalance: 10,
  active: true,
  description: null,
  bank: null,
  number: null,
  agency: null,
}

const previousUserOption: WalletListView = {
  id: 'wallet-1',
  name: 'Previous user wallet',
  type: 'PERSONAL',
  bank: null,
  active: true,
}

function loadPreviousUserData() {
  const wallets = useWalletsStore()
  wallets.wallet = previousUserWallet
  wallets.wallets = [previousUserOption]
  wallets.pageResponse.totalElements = 1
}

function expectWalletsAtInitialState() {
  const wallets = useWalletsStore()
  expect(wallets.wallet).toBeNull()
  expect(wallets.wallets).toEqual([])
  expect(wallets.pageResponse.totalElements).toBe(0)
}

describe('session end and the user stores', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(authApi.logout).mockResolvedValue()
    loadPreviousUserData()
  })

  it('restoreSession() failing leaves every user store at its initial state', async () => {
    vi.mocked(authApi.fetchSession).mockRejectedValue(new ApiError(null, 401))

    await expect(useAuthStore().restoreSession()).resolves.toBe(false)

    expectWalletsAtInitialState()
  })

  it('expireSession() leaves every user store at its initial state', async () => {
    const auth = useAuthStore()
    auth.session = session

    await auth.expireSession('inactivity')

    expectWalletsAtInitialState()
    expect(router.replace).toHaveBeenCalledOnce()
  })

  it('a login that follows an expiry starts from stores at their initial state', async () => {
    const auth = useAuthStore()
    auth.session = session
    await auth.expireSession('expired')
    loadPreviousUserData()
    vi.mocked(authApi.login).mockResolvedValue({ kind: 'authenticated', session })

    await auth.login({ email: session.email, password: 'secret' })

    expectWalletsAtInitialState()
    expect(auth.session).toEqual(session)
  })
})
