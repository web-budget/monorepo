import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { transfersApi } from '@/api/transfers'
import { toTransferQuery, useTransfersStore } from '@/stores/transfers'
import { createPageRequest } from '@/utils/pageRequest'
import type { TransferView } from '@/types'

vi.mock('@/api/transfers')

const transfer = { id: 't-1' } as TransferView

describe('useTransfersStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads a transfer and keeps it', async () => {
    vi.mocked(transfersApi.findById).mockResolvedValue(transfer)
    const store = useTransfersStore()

    await expect(store.findOne('t-1')).resolves.toEqual(transfer)

    expect(store.transfer).toEqual(transfer)
    expect(store.loading).toBe(false)
  })

  it('creates and gives back, returning the id of the new transfer', async () => {
    vi.mocked(transfersApi.create).mockResolvedValue('t-2')
    vi.mocked(transfersApi.giveBack).mockResolvedValue('t-3')
    const store = useTransfersStore()

    await expect(
      store.create({ fromWallet: 'a', toWallet: 'b', value: 1, description: null }),
    ).resolves.toBe('t-2')
    await expect(store.giveBack('t-2')).resolves.toBe('t-3')
  })

  it('stops loading when a call fails', async () => {
    vi.mocked(transfersApi.giveBack).mockRejectedValue(new Error('boom'))
    const store = useTransfersStore()

    await expect(store.giveBack('t-1')).rejects.toThrow('boom')
    expect(store.loading).toBe(false)
  })

  it('loads the page of transfers with the filters of the store', async () => {
    vi.mocked(transfersApi.findAll).mockResolvedValue({
      content: [transfer],
      page: { size: 15, number: 0, totalElements: 1, totalPages: 1 },
    })
    const store = useTransfersStore()
    store.filters = { wallet: 'w-1', from: '2026-11-01' }

    await store.findAll()

    expect(transfersApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ wallet: 'w-1', from: '2026-11-01', page: 0 }),
    )
    expect(store.pageResponse.content).toEqual([transfer])
    expect(store.loading).toBe(false)
  })

  it('leaves out everything that is not filled', () => {
    expect(toTransferQuery(createPageRequest({ status: 'ALL' }), {})).toEqual({
      filter: undefined,
      wallet: undefined,
      from: undefined,
      to: undefined,
      page: 0,
      size: 15,
      sort: 'createdOn,desc',
    })
  })

  it('forgets the transfer when it is reset', async () => {
    vi.mocked(transfersApi.findById).mockResolvedValue(transfer)
    const store = useTransfersStore()
    await store.findOne('t-1')

    store.filters = { wallet: 'w-1' }
    store.reset()

    expect(store.transfer).toBeNull()
    expect(store.filters).toEqual({})
    expect(store.pageResponse.content).toEqual([])
  })
})
