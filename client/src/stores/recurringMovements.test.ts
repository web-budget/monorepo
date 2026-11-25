import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { recurringMovementsApi } from '@/api/recurringMovements'
import { toRecurringMovementQuery, useRecurringMovementsStore } from '@/stores/recurringMovements'
import type { RecurringMovementView, RecurringValueView } from '@/types'

vi.mock('@/api/recurringMovements')

const view = { id: 'r-1', name: 'Rent' } as RecurringMovementView
const page = { content: [view], page: { size: 15, number: 0, totalElements: 1, totalPages: 1 } }

describe('toRecurringMovementQuery', () => {
  const base = { filter: '', status: 'ALL', page: 0, size: 15, sort: 'createdOn,desc' }

  it('leaves the situation and the type out for the all tab', () => {
    expect(toRecurringMovementQuery(base, {})).toEqual({
      filter: undefined,
      type: undefined,
      ended: undefined,
      page: 0,
      size: 15,
      sort: 'createdOn,desc',
    })
  })

  it('asks for the ones not ended on the active tab', () => {
    expect(
      toRecurringMovementQuery({ ...base, status: 'ACTIVE' }, { type: 'INCOME' }),
    ).toMatchObject({ type: 'INCOME', ended: false })
  })

  it('asks for the ended ones, inactive or finished, on the ended tab and keeps the text', () => {
    expect(
      toRecurringMovementQuery({ ...base, status: 'FINISHED', filter: 'rent' }, {}),
    ).toMatchObject({ filter: 'rent', ended: true })
  })

  it('works without a status', () => {
    expect(toRecurringMovementQuery({ page: 1 }, {})).toMatchObject({ ended: undefined, page: 1 })
  })
})

describe('useRecurringMovementsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('opens on the active tab, by name, and loads the page with the filters of the store', async () => {
    vi.mocked(recurringMovementsApi.findAll).mockResolvedValue(page)
    const store = useRecurringMovementsStore()
    store.filters = { type: 'EXPENSE' }

    await store.findAll()

    expect(store.pageRequest.status).toBe('ACTIVE')
    expect(recurringMovementsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'EXPENSE', ended: false, sort: 'name,asc' }),
    )
    expect(store.pageResponse.content).toEqual([view])
  })

  it('loads one, creates, updates and removes', async () => {
    vi.mocked(recurringMovementsApi.findById).mockResolvedValue(view)
    vi.mocked(recurringMovementsApi.create).mockResolvedValue('r-2')
    vi.mocked(recurringMovementsApi.update).mockResolvedValue(view)
    vi.mocked(recurringMovementsApi.remove).mockResolvedValue(undefined)
    const store = useRecurringMovementsStore()

    await expect(store.findOne('r-1')).resolves.toEqual(view)
    expect(store.recurringMovement).toEqual(view)
    await expect(store.create({} as never)).resolves.toBe('r-2')
    await expect(store.update('r-1', {} as never)).resolves.toEqual(view)
    await store.remove('r-1')
    expect(recurringMovementsApi.remove).toHaveBeenCalledWith('r-1')
  })

  it('keeps the readjusted recurring movement', async () => {
    const readjusted = { ...view, value: 1500 } as RecurringMovementView
    vi.mocked(recurringMovementsApi.readjust).mockResolvedValue(readjusted)
    const store = useRecurringMovementsStore()

    await expect(store.readjust('r-1', { value: 1500, reason: null })).resolves.toEqual(readjusted)

    expect(store.recurringMovement).toEqual(readjusted)
  })

  it('loads a page of the value history', async () => {
    const value = { value: 1000, reason: null, validFrom: '2026-01-01T00:00:00' }
    vi.mocked(recurringMovementsApi.findValues).mockResolvedValue({
      content: [value as RecurringValueView],
      page: { size: 15, number: 1, totalElements: 20, totalPages: 2 },
    })
    const store = useRecurringMovementsStore()

    await store.findValues('r-1', 1, 15)

    expect(recurringMovementsApi.findValues).toHaveBeenCalledWith('r-1', { page: 1, size: 15 })
    expect(store.values).toEqual({
      content: [value],
      size: 15,
      number: 1,
      totalElements: 20,
      totalPages: 2,
    })
  })

  it('loads the launches of the recurring movement by period', async () => {
    const launch = {
      financialPeriod: { id: 'p-1', name: 'Novembro de 2026', startingAt: '2026-11-01' },
      installment: 1,
      movement: 'm-1',
      value: 100,
      status: 'PAID',
      valuePaid: 90,
    }
    vi.mocked(recurringMovementsApi.findLaunches).mockResolvedValue({
      content: [launch],
      page: { size: 12, number: 0, totalElements: 1, totalPages: 1 },
    })
    const store = useRecurringMovementsStore()

    await store.findLaunches('r-1')

    expect(recurringMovementsApi.findLaunches).toHaveBeenCalledWith('r-1', { page: 0, size: 12 })
    expect(store.launches).toEqual([launch])
    store.reset()
    expect(store.launches).toEqual([])
  })

  it('goes back to the start on reset', async () => {
    vi.mocked(recurringMovementsApi.findAll).mockResolvedValue(page)
    const store = useRecurringMovementsStore()
    store.filters = { type: 'INCOME' }
    store.pageRequest.status = 'ALL'
    await store.findAll()

    store.reset()

    expect(store.filters).toEqual({})
    expect(store.pageRequest.status).toBe('ACTIVE')
    expect(store.pageResponse.content).toEqual([])
    expect(store.values.content).toEqual([])
  })
})
