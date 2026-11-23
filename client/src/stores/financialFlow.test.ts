import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dashboardsApi } from '@/api/dashboards'
import { useFinancialFlowStore } from '@/stores/financialFlow'
import type { FinancialFlowView } from '@/types'

vi.mock('@/api/dashboards')

const flow: FinancialFlowView = {
  year: 2026,
  totals: { revenues: 10, expenses: 4, result: 6 },
  periods: [],
}

describe('useFinancialFlowStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads the flow of a year', async () => {
    vi.mocked(dashboardsApi.findFinancialFlow).mockResolvedValue(flow)
    const store = useFinancialFlowStore()

    await store.find(2026)

    expect(dashboardsApi.findFinancialFlow).toHaveBeenCalledWith(2026)
    expect(store.flow).toEqual(flow)
    expect(store.loading).toBe(false)
  })

  it('stops loading when the call fails and forgets the flow on reset', async () => {
    const store = useFinancialFlowStore()
    vi.mocked(dashboardsApi.findFinancialFlow).mockResolvedValueOnce(flow)
    await store.find(2026)
    vi.mocked(dashboardsApi.findFinancialFlow).mockRejectedValue(new Error('boom'))

    await expect(store.find(2025)).rejects.toThrow('boom')
    expect(store.loading).toBe(false)

    store.reset()
    expect(store.flow).toBeNull()
  })
})
