import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { periodResultsApi } from '@/api/periodResults'
import type { FinancialPeriodListView, FinancialPeriodView } from '@/types'
import { useFinancialPeriodsStore } from './financialPeriods'

vi.mock('@/api/financialPeriods')
vi.mock('@/api/periodResults')

const row: FinancialPeriodListView = {
  id: 'fp-1',
  name: '01/2026',
  startingAt: '2026-01-01',
  endingAt: '2026-01-31',
  status: 'OPEN',
  expired: false,
}
const view: FinancialPeriodView = { ...row, revenuesGoal: 1000, expensesGoal: 800 }
const report = { launched: [{ recurringMovement: 'r-1' }], skipped: [] } as never
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
    store.pageRequest.status = 'CLOSED'

    await store.findAll()

    expect(financialPeriodsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'CLOSED' }),
    )
  })

  it('creates, loads, edits and removes a period', async () => {
    vi.mocked(financialPeriodsApi.create).mockResolvedValue({
      id: 'new-id',
      recurringLaunch: report,
    })
    vi.mocked(financialPeriodsApi.findById).mockResolvedValue(view)
    vi.mocked(financialPeriodsApi.update).mockResolvedValue({ ...view, expensesGoal: 900 })
    vi.mocked(financialPeriodsApi.remove).mockResolvedValue()
    const store = useFinancialPeriodsStore()

    await expect(
      store.create({ name: '01/2026', startingAt: '2026-01-01', endingAt: '2026-01-31' }),
    ).resolves.toBe('new-id')
    expect(store.recurringLaunch).toEqual(report)
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

  it('keeps what the creation launched until it is reset', async () => {
    vi.mocked(financialPeriodsApi.create).mockResolvedValue({ id: 'x', recurringLaunch: report })
    const store = useFinancialPeriodsStore()

    await store.create({ name: 'a', startingAt: '2026-01-01', endingAt: '2026-01-31' })
    expect(store.recurringLaunch).toEqual(report)

    store.reset()
  })

  it('reset() goes back to the open periods filter', async () => {
    vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(page)
    const store = useFinancialPeriodsStore()
    store.pageRequest.status = 'ALL'
    await store.findAll()

    store.reset()

    expect(store.recurringLaunch).toEqual({ launched: [], skipped: [] })
    expect(store.pageRequest.status).toBe('OPEN')
    expect(store.pageResponse.content).toEqual([])
  })

  it('loads the results of the closed periods of the page and which one closed last', async () => {
    vi.mocked(periodResultsApi.findAll).mockResolvedValue({
      content: [{ id: 'r-1', financialPeriod: { id: 'fp-9' }, result: 10 }] as never,
      page: { size: 100, number: 0, totalElements: 1, totalPages: 1 },
    })
    vi.mocked(financialPeriodsApi.findAll).mockResolvedValue({
      content: [{ id: 'fp-9' }] as never,
      page: { size: 1, number: 0, totalElements: 1, totalPages: 1 },
    })
    const store = useFinancialPeriodsStore()
    const closed = (id: string, endingAt: string) => ({ id, endingAt, status: 'CLOSED' }) as never

    await store.loadClosedInformation([
      closed('fp-8', '2026-02-28'),
      closed('fp-9', '2026-03-31'),
      row,
    ])

    expect(periodResultsApi.findAll).toHaveBeenCalledWith({
      from: '2026-02-28',
      to: '2026-03-31',
      size: 100,
    })
    expect(financialPeriodsApi.findAll).toHaveBeenCalledWith({
      status: 'CLOSED',
      size: 1,
      sort: 'endingAt,desc',
    })
    expect(Object.keys(store.results)).toEqual(['fp-9'])
    expect(store.lastClosedId).toBe('fp-9')

    await store.loadClosedInformation([row])
    expect(store.results).toEqual({})
    expect(store.lastClosedId).toBeNull()
  })

  it('finds the id of the last closed period, if there is one', async () => {
    const store = useFinancialPeriodsStore()
    vi.mocked(financialPeriodsApi.findAll).mockResolvedValueOnce({ ...page, content: [] })
    await expect(store.findLastClosedId()).resolves.toBeNull()

    vi.mocked(financialPeriodsApi.findAll).mockResolvedValueOnce({
      ...page,
      content: [{ id: 'fp-3' }] as never,
    })
    await expect(store.findLastClosedId()).resolves.toBe('fp-3')
  })

  it('closes and reopens a period', async () => {
    vi.mocked(financialPeriodsApi.close).mockResolvedValue({
      revenues: 1,
      expenses: 1,
      result: 0,
      recorded: true,
    })
    vi.mocked(financialPeriodsApi.reopen).mockResolvedValue(undefined)
    const store = useFinancialPeriodsStore()

    await expect(store.close('fp-1')).resolves.toMatchObject({ recorded: true })
    await store.reopen('fp-1')

    expect(financialPeriodsApi.reopen).toHaveBeenCalledWith('fp-1')
  })

  it('forgets the results on reset', async () => {
    vi.mocked(periodResultsApi.findAll).mockResolvedValue({
      content: [{ id: 'r-1', financialPeriod: { id: 'fp-9' } }] as never,
      page: { size: 100, number: 0, totalElements: 1, totalPages: 1 },
    })
    vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(page)
    const store = useFinancialPeriodsStore()
    await store.loadClosedInformation([{ ...row, status: 'CLOSED' }])

    store.reset()

    expect(store.results).toEqual({})
    expect(store.lastClosedId).toBeNull()
  })
})
