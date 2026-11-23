import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { walletEntriesApi } from '@/api/walletEntries'
import { toStatementQuery, useStatementStore } from '@/stores/statement'
import { createPageRequest } from '@/utils/pageRequest'
import type { WalletEntryDirectionFilter, WalletEntryView } from '@/types'

vi.mock('@/api/walletEntries')

const entry = { id: 'e-1', name: 'Luz' } as WalletEntryView
const page = { content: [entry], page: { size: 15, number: 0, totalElements: 1, totalPages: 1 } }

describe('toStatementQuery', () => {
  const request = createPageRequest<WalletEntryDirectionFilter>({ status: 'ALL' })

  it('leaves out everything that is not filled', () => {
    expect(toStatementQuery(request, {})).toEqual({
      filter: undefined,
      direction: undefined,
      from: undefined,
      to: undefined,
      financialPeriod: undefined,
      origins: undefined,
      minValue: undefined,
      maxValue: undefined,
      page: 0,
      size: 15,
      sort: 'createdOn,desc',
    })
  })

  it('translates the filters to what the server understands', () => {
    expect(
      toStatementQuery(
        { ...request, filterText: 'luz', status: 'DEBIT' },
        {
          from: '2026-11-01',
          to: '2026-11-30',
          period: 'p-1',
          origin: 'EXPENSE',
          min: '1.5',
          max: '20',
        },
      ),
    ).toMatchObject({
      filter: 'luz',
      direction: 'DEBIT',
      from: '2026-11-01',
      to: '2026-11-30',
      financialPeriod: 'p-1',
      origins: ['EXPENSE'],
      minValue: 1.5,
      maxValue: 20,
    })
  })

  it('drops a value that is not a number', () => {
    expect(toStatementQuery(request, { min: 'abc' }).minValue).toBeUndefined()
  })
})

describe('useStatementStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads the statement of the chosen wallet with the filters of the store', async () => {
    vi.mocked(walletEntriesApi.findStatement).mockResolvedValue(page)
    const store = useStatementStore()
    store.filters = { wallet: 'w-1', from: '2026-11-01' }

    await store.findAll()

    expect(walletEntriesApi.findStatement).toHaveBeenCalledWith(
      'w-1',
      expect.objectContaining({ from: '2026-11-01' }),
    )
    expect(store.pageResponse.content).toEqual([entry])
    expect(store.loading).toBe(false)
  })

  it('asks for no wallet when none was chosen', async () => {
    vi.mocked(walletEntriesApi.findStatement).mockResolvedValue(page)

    await useStatementStore().findAll()

    expect(walletEntriesApi.findStatement).toHaveBeenCalledWith('', expect.anything())
  })

  it('adjusts the balance and stops loading even when it fails', async () => {
    vi.mocked(walletEntriesApi.adjust).mockResolvedValueOnce(entry)
    const store = useStatementStore()

    await expect(store.adjust('w-1', { value: 1, name: 'x' })).resolves.toBe(entry)

    vi.mocked(walletEntriesApi.adjust).mockRejectedValueOnce(new Error('boom'))
    await expect(store.adjust('w-1', { value: 1, name: 'x' })).rejects.toThrow('boom')
    expect(store.loading).toBe(false)
  })

  it('stops loading when the statement fails', async () => {
    vi.mocked(walletEntriesApi.findStatement).mockRejectedValue(new Error('boom'))
    const store = useStatementStore()

    await expect(store.findAll()).rejects.toThrow('boom')
    expect(store.loading).toBe(false)
  })

  it('forgets the filters and the page when it is reset', async () => {
    vi.mocked(walletEntriesApi.findStatement).mockResolvedValue(page)
    const store = useStatementStore()
    store.filters = { wallet: 'w-1' }
    await store.findAll()

    store.reset()

    expect(store.filters).toEqual({})
    expect(store.pageResponse.content).toEqual([])
  })
})
