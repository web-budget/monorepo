import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reconciliationsApi } from '@/api/reconciliations'
import { walletEntriesApi } from '@/api/walletEntries'
import { toStatementFilter, toStatementQuery, useStatementStore } from '@/stores/statement'
import { createPageRequest } from '@/utils/pageRequest'
import type {
  ReconciliationResultView,
  StatementSummary,
  WalletEntryDirectionFilter,
  WalletEntryView,
} from '@/types'

vi.mock('@/api/walletEntries')
vi.mock('@/api/reconciliations')

const entry = { id: 'e-1', name: 'Luz' } as WalletEntryView
const page = { content: [entry], page: { size: 15, number: 0, totalElements: 1, totalPages: 1 } }

describe('toStatementFilter', () => {
  it('has the filters and none of the paging, for the summary', () => {
    const request = createPageRequest<WalletEntryDirectionFilter>({ status: 'CREDIT' })

    const filter = toStatementFilter({ ...request, filterText: 'luz' }, { from: '2026-11-01' })

    expect(filter).toMatchObject({ filter: 'luz', direction: 'CREDIT', from: '2026-11-01' })
    expect(filter).not.toHaveProperty('page')
    expect(filter).not.toHaveProperty('sort')
  })
})

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

  it('reconciles the wallet and stops loading even when it fails', async () => {
    const result = { reconciliation: { difference: 1 }, entry } as ReconciliationResultView
    const form = { informedBalance: 11, shownBalance: 10, reason: 'Centavos' }
    vi.mocked(reconciliationsApi.reconcile).mockResolvedValueOnce(result)
    const store = useStatementStore()

    await expect(store.reconcile('w-1', form)).resolves.toBe(result)
    expect(reconciliationsApi.reconcile).toHaveBeenCalledWith('w-1', form)

    vi.mocked(reconciliationsApi.reconcile).mockRejectedValueOnce(new Error('boom'))
    await expect(store.reconcile('w-1', form)).rejects.toThrow('boom')
    expect(store.loading).toBe(false)
  })

  it('loads the summary of the filter, without the paging', async () => {
    const summary: StatementSummary = {
      credits: { total: 10, count: 1 },
      debits: { total: 5, count: 2 },
      lastEntryOn: null,
    }
    vi.mocked(walletEntriesApi.findSummary).mockResolvedValue(summary)
    const store = useStatementStore()
    store.filters = { wallet: 'w-1', from: '2026-11-01' }

    await store.findSummary()

    expect(walletEntriesApi.findSummary).toHaveBeenCalledWith(
      'w-1',
      expect.not.objectContaining({ page: 0 }),
    )
    expect(vi.mocked(walletEntriesApi.findSummary).mock.calls[0]![1]).toMatchObject({
      from: '2026-11-01',
    })
    expect(store.summary).toEqual(summary)
    expect(store.loading).toBe(false)
  })

  it('asks for the summary of no wallet when none was chosen and stops loading on failure', async () => {
    vi.mocked(walletEntriesApi.findSummary).mockRejectedValue(new Error('boom'))
    const store = useStatementStore()

    await expect(store.findSummary()).rejects.toThrow('boom')

    expect(walletEntriesApi.findSummary).toHaveBeenCalledWith('', expect.anything())
    expect(store.loading).toBe(false)
  })

  it('loads one entry of a wallet and stops loading even when it fails', async () => {
    vi.mocked(walletEntriesApi.findEntry).mockResolvedValueOnce(entry)
    const store = useStatementStore()

    await expect(store.findEntry('w-1', 'e-1')).resolves.toBe(entry)
    expect(walletEntriesApi.findEntry).toHaveBeenCalledWith('w-1', 'e-1')

    vi.mocked(walletEntriesApi.findEntry).mockRejectedValueOnce(new Error('boom'))
    await expect(store.findEntry('w-1', 'e-1')).rejects.toThrow('boom')
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
    store.summary = {
      credits: { total: 1, count: 1 },
      debits: { total: 0, count: 0 },
      lastEntryOn: null,
    }

    store.reset()

    expect(store.filters).toEqual({})
    expect(store.pageResponse.content).toEqual([])
    expect(store.summary).toBeNull()
  })
})
