import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { financialPeriodsApi } from '@/api/financialPeriods'
import type { FinancialPeriodListView, FinancialPeriodView } from '@/types'
import { useFinancialPeriodsStore } from './financialPeriods'

vi.mock('@/api/financialPeriods')

const row: FinancialPeriodListView = {
  id: 'fp-1',
  name: '01/2026',
  startingAt: '2026-01-01',
  endingAt: '2026-01-31',
  status: 'ACTIVE',
}
const view: FinancialPeriodView = { ...row, revenuesGoal: 1000, expensesGoal: 800 }
const page = { content: [row], page: { size: 15, number: 0, totalElements: 1, totalPages: 1 } }

describe('useFinancialPeriodsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('lists open periods, newest first, by default', async () => {
    vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(page)
    const store = useFinancialPeriodsStore()

    await store.findAll()

    expect(financialPeriodsApi.findAll).toHaveBeenCalledWith({
      filter: '',
      status: 'OPEN',
      page: 0,
      size: 15,
      sort: 'createdOn,desc',
    })
    expect(store.pageResponse.content).toEqual([row])
  })

  it('lists accounted periods when the filter asks for them', async () => {
    vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(page)
    const store = useFinancialPeriodsStore()
    store.pageRequest.status = 'ACCOUNTED'

    await store.findAll()

    expect(financialPeriodsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACCOUNTED' }),
    )
  })

  it('creates, loads, edits and removes a period', async () => {
    vi.mocked(financialPeriodsApi.create).mockResolvedValue('new-id')
    vi.mocked(financialPeriodsApi.findById).mockResolvedValue(view)
    vi.mocked(financialPeriodsApi.update).mockResolvedValue({ ...view, expensesGoal: 900 })
    vi.mocked(financialPeriodsApi.remove).mockResolvedValue()
    const store = useFinancialPeriodsStore()

    await store.create({ name: '01/2026', startingAt: '2026-01-01', endingAt: '2026-01-31' })
    expect(financialPeriodsApi.create).toHaveBeenCalledWith({
      name: '01/2026',
      startingAt: '2026-01-01',
      endingAt: '2026-01-31',
    })

    await store.findOne('fp-1')
    expect(store.financialPeriod).toEqual(view)

    await store.update('fp-1', { name: '01/2026', expensesGoal: 900 })
    expect(store.financialPeriod?.expensesGoal).toBe(900)

    await store.remove('fp-1')
    expect(store.financialPeriod).toBeNull()
  })

  it('reset() goes back to the open periods filter', async () => {
    vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(page)
    const store = useFinancialPeriodsStore()
    store.pageRequest.status = 'ALL'
    await store.findAll()

    store.reset()

    expect(store.pageRequest.status).toBe('OPEN')
    expect(store.pageResponse.content).toEqual([])
  })
})
