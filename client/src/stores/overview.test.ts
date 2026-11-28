import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dashboardsApi } from '@/api/dashboards'
import { useOverviewStore } from '@/stores/overview'
import { overviewExtras } from '@/test/overviewFixtures'
import type { OverviewView } from '@/types'

vi.mock('@/api/dashboards')

const overview: OverviewView = {
  cut: '2026',
  years: [2025, 2026],
  totals: {
    revenues: 10,
    expenses: 4,
    result: 6,
    savingsRate: 0.6,
    redPeriods: 0,
    periodsWithMovement: 1,
  },
  resultByYear: [],
  periods: [],
  ...overviewExtras,
}

describe('useOverviewStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads the overview of a year or of all the periods', async () => {
    vi.mocked(dashboardsApi.findOverview).mockResolvedValue(overview)
    const store = useOverviewStore()

    await store.find(2026)
    expect(dashboardsApi.findOverview).toHaveBeenLastCalledWith(2026)
    expect(store.overview).toEqual(overview)
    expect(store.loading).toBe(false)

    await store.find('all')
    expect(dashboardsApi.findOverview).toHaveBeenLastCalledWith('all')
  })

  it('stops loading when the call fails and forgets the overview on reset', async () => {
    const store = useOverviewStore()
    vi.mocked(dashboardsApi.findOverview).mockResolvedValueOnce(overview)
    await store.find(2026)
    vi.mocked(dashboardsApi.findOverview).mockRejectedValue(new Error('boom'))

    await expect(store.find(2025)).rejects.toThrow('boom')
    expect(store.loading).toBe(false)

    store.reset()
    expect(store.overview).toBeNull()
  })
})
