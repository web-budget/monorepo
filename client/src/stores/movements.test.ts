import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { movementsApi } from '@/api/movements'
import { toMovementQuery, useMovementsStore } from '@/stores/movements'
import type { MovementListView, MovementView } from '@/types'

vi.mock('@/api/movements')

const row = { id: 'm-1', name: 'Rent' } as MovementListView
const view = { id: 'm-1', name: 'Rent' } as MovementView
const page = { content: [row], page: { size: 15, number: 0, totalElements: 1, totalPages: 1 } }

describe('toMovementQuery', () => {
  const base = { filter: '', status: 'ALL', page: 0, size: 15, sort: 'createdOn,desc' }

  it('leaves out everything that is not filled', () => {
    expect(toMovementQuery(base, {})).toEqual({
      filter: undefined,
      statuses: undefined,
      type: undefined,
      costCenter: undefined,
      classification: undefined,
      overdue: undefined,
      financialPeriods: undefined,
      page: 0,
      size: 15,
      sort: 'createdOn,desc',
    })
  })

  it('translates the filters to what the server understands', () => {
    expect(
      toMovementQuery(
        { ...base, filter: 'rent', status: 'OPEN' },
        { type: 'INCOME', costCenter: 'cc', classification: 'cl', overdue: 'true', period: 'p-1' },
      ),
    ).toMatchObject({
      filter: 'rent',
      statuses: ['OPEN'],
      type: 'INCOME',
      costCenter: 'cc',
      classification: 'cl',
      overdue: true,
      financialPeriods: ['p-1'],
    })
  })

  it('does not filter by period when all of them are asked for', () => {
    expect(toMovementQuery(base, { period: 'all' }).financialPeriods).toBeUndefined()
  })

  it('treats a missing status as all', () => {
    expect(toMovementQuery({ page: 0 }, {}).statuses).toBeUndefined()
  })
})

describe('useMovementsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('lists the movements with the filters of the store', async () => {
    vi.mocked(movementsApi.findAll).mockResolvedValue(page)
    const store = useMovementsStore()
    store.filters = { period: 'p-1' }

    await store.findAll()

    expect(movementsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ financialPeriods: ['p-1'], sort: 'createdOn,desc' }),
    )
    expect(store.pageResponse.content).toEqual([row])
  })

  it('counts a situation with the same filters, without the text', async () => {
    vi.mocked(movementsApi.findAll).mockResolvedValue(page)
    const store = useMovementsStore()
    store.filters = { type: 'EXPENSE' }

    await expect(store.count('PAID')).resolves.toBe(1)

    expect(movementsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ statuses: ['PAID'], type: 'EXPENSE', size: 1 }),
    )
  })

  it('loads, creates, updates and removes a movement', async () => {
    vi.mocked(movementsApi.findById).mockResolvedValue(view)
    vi.mocked(movementsApi.create).mockResolvedValue('m-9')
    vi.mocked(movementsApi.update).mockResolvedValue({ ...view, name: 'Rent 2' })
    vi.mocked(movementsApi.remove).mockResolvedValue(undefined)
    const store = useMovementsStore()

    await store.findOne('m-1')
    expect(store.movement).toEqual(view)

    await expect(
      store.create({
        name: 'Rent',
        type: 'EXPENSE',
        value: 1,
        financialPeriod: 'p',
        classification: 'cl',
        costCenter: 'cc',
      }),
    ).resolves.toBe('m-9')

    await store.update('m-1', { name: 'Rent 2', value: 1, classification: 'cl', costCenter: 'cc' })
    expect(store.movement?.name).toBe('Rent 2')

    await store.remove('m-1')
    expect(store.movement).toBeNull()
  })

  it('forgets the filters and the page when it is reset', async () => {
    vi.mocked(movementsApi.findAll).mockResolvedValue(page)
    const store = useMovementsStore()
    store.filters = { type: 'INCOME' }
    await store.findAll()

    store.reset()

    expect(store.filters).toEqual({})
    expect(store.pageResponse.content).toEqual([])
  })
})
