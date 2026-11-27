import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { compartmentsApi } from '@/api/compartments'
import { useCompartmentsStore } from '@/stores/compartments'
import type { CompartmentView } from '@/types'

vi.mock('@/api/compartments')

const compartment: CompartmentView = {
  id: 'k-1',
  name: 'Emergency',
  type: 'RESERVE',
  balance: 10,
  statementEntryCount: 0,
  achieved: false,
  overdue: false,
}

describe('compartments store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('loads the piggy banks of a wallet and one of them', async () => {
    vi.mocked(compartmentsApi.findAll).mockResolvedValue([compartment])
    vi.mocked(compartmentsApi.findById).mockResolvedValue(compartment)
    const store = useCompartmentsStore()

    await store.findAll('w-1')
    await store.findOne('w-1', 'k-1')

    expect(store.compartments).toEqual([compartment])
    expect(store.compartment).toEqual(compartment)
    expect(compartmentsApi.findById).toHaveBeenCalledWith('w-1', 'k-1')
  })

  it('creates, updates, removes and moves through the API', async () => {
    vi.mocked(compartmentsApi.create).mockResolvedValue('k-2')
    vi.mocked(compartmentsApi.update).mockResolvedValue(compartment)
    vi.mocked(compartmentsApi.remove).mockResolvedValue(undefined)
    vi.mocked(compartmentsApi.move).mockResolvedValue({ compartmentBalance: 5 } as never)
    const store = useCompartmentsStore()

    expect(await store.create('w-1', { name: 'A', type: 'RESERVE' })).toBe('k-2')
    expect(await store.update('w-1', 'k-1', { name: 'B' })).toEqual(compartment)
    await store.remove('w-1', 'k-1')
    const moved = await store.move('w-1', 'k-1', { direction: 'DEPOSIT', value: 5 })

    expect(moved.compartmentBalance).toBe(5)
    expect(compartmentsApi.move).toHaveBeenCalledWith('w-1', 'k-1', {
      direction: 'DEPOSIT',
      value: 5,
    })
  })

  it('loads the history with the page and the order of the request', async () => {
    vi.mocked(compartmentsApi.findMovements).mockResolvedValue({
      content: [{ id: 'm-1' } as never],
      page: { size: 30, number: 1, totalElements: 31, totalPages: 2 },
    })
    const store = useCompartmentsStore()
    store.pageRequest.current = 1
    store.pageRequest.size = 30
    store.pageRequest.sortField = 'value'
    store.pageRequest.direction = 'asc'

    await store.findMovements('w-1', 'k-1')

    expect(compartmentsApi.findMovements).toHaveBeenCalledWith('w-1', 'k-1', {
      page: 1,
      size: 30,
      sort: 'value,asc',
    })
    expect(store.pageResponse.totalElements).toBe(31)
    expect(store.pageResponse.content).toHaveLength(1)
  })

  it('finds the position of a movement', async () => {
    vi.mocked(compartmentsApi.findPosition).mockResolvedValue({ position: 4 })
    const store = useCompartmentsStore()

    expect(await store.findPosition('w-1', 'k-1', 'm-1', 'createdOn,desc')).toBe(4)
    expect(compartmentsApi.findPosition).toHaveBeenCalledWith('w-1', 'k-1', 'm-1', 'createdOn,desc')
  })

  it('counts the pending calls as loading, even when one fails', async () => {
    vi.mocked(compartmentsApi.remove).mockRejectedValue(new Error('failed'))
    const store = useCompartmentsStore()

    await expect(store.remove('w-1', 'k-1')).rejects.toThrow('failed')

    expect(store.loading).toBe(false)
  })

  it('forgets everything on reset', async () => {
    vi.mocked(compartmentsApi.findAll).mockResolvedValue([compartment])
    const store = useCompartmentsStore()
    await store.findAll('w-1')
    store.compartment = compartment

    store.reset()

    expect(store.compartments).toEqual([])
    expect(store.compartment).toBeNull()
    expect(store.pageResponse.content).toEqual([])
  })
})
