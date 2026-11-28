import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { costCentersApi } from '@/api/costCenters'
import type { CostCenterListView, CostCenterView } from '@/types'
import { useCostCentersStore } from './costCenters'

vi.mock('@/api/costCenters')

const row: CostCenterListView = {
  id: 'cc-1',
  name: 'Home',
  fullName: 'Home',
  active: true,
  incomeBudget: null,
  expenseBudget: 300,
}
const view: CostCenterView = {
  id: 'cc-1',
  name: 'Home',
  active: true,
  description: null,
  incomeBudget: null,
  expenseBudget: 300,
  parentCostCenter: null,
}
const page = { content: [row], page: { size: 15, number: 0, totalElements: 1, totalPages: 1 } }

describe('useCostCentersStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('lists cost centers by full name, ascending', async () => {
    vi.mocked(costCentersApi.findAll).mockResolvedValue(page)
    const store = useCostCentersStore()

    await store.findAll()

    expect(costCentersApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', sort: 'fullName,asc' }),
    )
    expect(store.pageResponse.content).toEqual([row])
  })

  it('searches active cost centers by name to pick a parent', async () => {
    vi.mocked(costCentersApi.findAll).mockResolvedValue(page)
    const store = useCostCentersStore()

    await store.findByName('Ho')

    expect(costCentersApi.findAll).toHaveBeenCalledWith({
      filter: 'Ho',
      status: 'ACTIVE',
      sort: 'fullName,asc',
    })
    expect(store.costCenters).toEqual([row])
  })

  it('keeps the cost center being viewed and edited', async () => {
    vi.mocked(costCentersApi.findById).mockResolvedValue(view)
    vi.mocked(costCentersApi.update).mockResolvedValue({ ...view, active: false })
    vi.mocked(costCentersApi.create).mockResolvedValue('new-id')
    vi.mocked(costCentersApi.remove).mockResolvedValue()
    const store = useCostCentersStore()

    await store.create({ name: 'Home', parentCostCenter: null })
    await store.findOne('cc-1')
    expect(store.costCenter).toEqual(view)

    await store.update('cc-1', { name: 'Home', active: false })
    expect(store.costCenter?.active).toBe(false)

    await store.remove('cc-1')
    expect(store.costCenter).toBeNull()
  })

  it('reset() clears the listing and the parent options', async () => {
    vi.mocked(costCentersApi.findAll).mockResolvedValue(page)
    const store = useCostCentersStore()
    await store.findAll()
    await store.findByName('Ho')

    store.reset()

    expect(store.pageResponse.content).toEqual([])
    expect(store.costCenters).toEqual([])
    expect(store.pageRequest.sortField).toBe('fullName')
    expect(store.pageRequest.direction).toBe('asc')
  })
})
