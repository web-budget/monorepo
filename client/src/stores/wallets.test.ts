import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { walletsApi } from '@/api/wallets'
import type { WalletListView, WalletView } from '@/types'
import { useWalletsStore } from './wallets'

vi.mock('@/api/wallets')

const row: WalletListView = { id: 'w-1', name: 'Main', type: 'PERSONAL', bank: null, active: true }
const view: WalletView = {
  ...row,
  currentBalance: 120.5,
  description: null,
  number: null,
  agency: null,
}
const page = { content: [row], page: { size: 15, number: 0, totalElements: 1, totalPages: 1 } }

describe('useWalletsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('lists active wallets sorted by creation by default', async () => {
    vi.mocked(walletsApi.findAll).mockResolvedValue(page)
    const store = useWalletsStore()

    await store.findAll()

    expect(walletsApi.findAll).toHaveBeenCalledWith({
      filter: '',
      status: 'ACTIVE',
      page: 0,
      size: 15,
      sort: 'createdOn,asc',
    })
    expect(store.pageResponse.content).toEqual([row])
    expect(store.pageResponse.totalElements).toBe(1)
  })

  it('searches active wallets by name for selection', async () => {
    vi.mocked(walletsApi.findAll).mockResolvedValue(page)
    const store = useWalletsStore()

    await store.findByName('Ma')

    expect(walletsApi.findAll).toHaveBeenCalledWith({ filter: 'Ma', status: 'ACTIVE' })
    expect(store.wallets).toEqual([row])
    expect(store.pageResponse.content).toEqual([])
  })

  it('keeps the wallet being viewed, edited and removed', async () => {
    vi.mocked(walletsApi.findById).mockResolvedValue(view)
    vi.mocked(walletsApi.update).mockResolvedValue({ ...view, name: 'Edited' })
    vi.mocked(walletsApi.remove).mockResolvedValue()
    const store = useWalletsStore()

    await store.findOne('w-1')
    expect(store.wallet).toEqual(view)

    await store.update('w-1', { name: 'Edited', active: true })
    expect(store.wallet?.name).toBe('Edited')

    await store.remove('w-1')
    expect(walletsApi.remove).toHaveBeenCalledWith('w-1')
    expect(store.wallet).toBeNull()
  })

  it('creates a wallet', async () => {
    vi.mocked(walletsApi.create).mockResolvedValue('new-id')
    const store = useWalletsStore()

    await store.create({ name: 'New', type: 'BANK_ACCOUNT' })

    expect(walletsApi.create).toHaveBeenCalledWith({ name: 'New', type: 'BANK_ACCOUNT' })
  })

  it('reset() clears the listing, the selection options and the current wallet', async () => {
    vi.mocked(walletsApi.findAll).mockResolvedValue(page)
    vi.mocked(walletsApi.findById).mockResolvedValue(view)
    const store = useWalletsStore()
    store.pageRequest.filterText = 'Ma'
    await store.findAll()
    await store.findByName('Ma')
    await store.findOne('w-1')

    store.reset()

    expect(store.pageRequest.filterText).toBe('')
    expect(store.pageResponse.content).toEqual([])
    expect(store.wallets).toEqual([])
    expect(store.wallet).toBeNull()
  })
})
