import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dashboardsApi } from '@/api/dashboards'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { usePeriodDashboardStore } from '@/stores/periodDashboard'
import type { FinancialPeriodListView, PeriodDashboardView } from '@/types'

vi.mock('@/api/dashboards')
vi.mock('@/api/financialPeriods')

const dashboard = { period: { id: 'p-1' } } as PeriodDashboardView

describe('usePeriodDashboardStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads the dashboard of a period, or of the current one without an id', async () => {
    vi.mocked(dashboardsApi.findPeriod).mockResolvedValue(dashboard)
    const store = usePeriodDashboardStore()

    await store.find('p-1')
    expect(dashboardsApi.findPeriod).toHaveBeenLastCalledWith('p-1')
    expect(store.dashboard).toEqual(dashboard)
    expect(store.loading).toBe(false)

    await store.find()
    expect(dashboardsApi.findPeriod).toHaveBeenLastCalledWith(undefined)
  })

  it('loads every period, the newest first, for the selector', async () => {
    vi.mocked(financialPeriodsApi.findAll).mockResolvedValue({
      content: [{ id: 'p-1' } as FinancialPeriodListView],
      page: { size: 100, number: 0, totalElements: 1, totalPages: 1 },
    })
    const store = usePeriodDashboardStore()

    await store.findPeriods()

    expect(financialPeriodsApi.findAll).toHaveBeenCalledWith({
      status: 'ALL',
      size: 100,
      sort: 'endingAt,desc',
    })
    expect(store.periods.map((period) => period.id)).toEqual(['p-1'])
  })

  it('keeps loading true during the call and drops it after a failure', async () => {
    let fail: (reason: Error) => void = () => undefined
    vi.mocked(dashboardsApi.findPeriod).mockReturnValue(
      new Promise((_, reject) => {
        fail = reject
      }),
    )
    vi.mocked(financialPeriodsApi.findAll).mockRejectedValue(new Error('boom'))
    const store = usePeriodDashboardStore()

    const pending = store.find('p-1')
    expect(store.loading).toBe(true)
    fail(new Error('boom'))
    await expect(pending).rejects.toThrow('boom')
    expect(store.loading).toBe(false)

    await expect(store.findPeriods()).rejects.toThrow('boom')
    expect(store.loading).toBe(false)
  })

  it('forgets everything on reset', async () => {
    vi.mocked(dashboardsApi.findPeriod).mockResolvedValue(dashboard)
    const store = usePeriodDashboardStore()
    await store.find()

    store.reset()

    expect(store.dashboard).toBeNull()
    expect(store.periods).toEqual([])
  })
})
