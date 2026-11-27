import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dashboardsApi } from '@/api/dashboards'
import { useCompositionStore } from '@/stores/composition'
import type { CompositionView } from '@/types'

vi.mock('@/api/dashboards')

const composition: CompositionView = {
  cut: '2026',
  years: [2026],
  expenses: 10,
  revenues: 20,
  costCenters: [],
  classifications: [],
  seasonality: [],
  incomeSources: [],
}

describe('useCompositionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads the composition of a year or of all the periods', async () => {
    vi.mocked(dashboardsApi.findComposition).mockResolvedValue(composition)
    const store = useCompositionStore()

    await store.find(2026)
    expect(dashboardsApi.findComposition).toHaveBeenLastCalledWith(2026)
    expect(store.composition).toEqual(composition)
    expect(store.loading).toBe(false)

    await store.find('all')
    expect(dashboardsApi.findComposition).toHaveBeenLastCalledWith('all')
  })

  it('keeps loading true during the call and drops it after a failure', async () => {
    let fail: (reason: Error) => void = () => undefined
    vi.mocked(dashboardsApi.findComposition).mockReturnValue(
      new Promise((_, reject) => {
        fail = reject
      }),
    )
    const store = useCompositionStore()

    const pending = store.find(2026)
    expect(store.loading).toBe(true)
    fail(new Error('boom'))
    await expect(pending).rejects.toThrow('boom')
    expect(store.loading).toBe(false)
  })

  it('forgets the composition on reset', async () => {
    vi.mocked(dashboardsApi.findComposition).mockResolvedValue(composition)
    const store = useCompositionStore()
    await store.find(2026)

    store.reset()

    expect(store.composition).toBeNull()
  })
})
