import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { recurringMovementsApi } from '@/api/recurringMovements'
import { launchValueOf, useRecurringLaunchStore } from '@/stores/recurringLaunch'
import type { RecurringMovementView } from '@/types'

vi.mock('@/api/recurringMovements')

const rent = {
  id: 'r-1',
  name: 'Aluguel',
  type: 'EXPENSE',
  valueKind: 'FIXED',
  value: 1200,
  suggestedValue: 1200,
} as RecurringMovementView

const energy = {
  id: 'r-2',
  name: 'Energia',
  type: 'EXPENSE',
  valueKind: 'VARIABLE',
  value: 180,
  suggestedValue: 210,
} as RecurringMovementView

const salary = {
  id: 'r-3',
  name: 'Salário',
  type: 'INCOME',
  valueKind: 'FIXED',
  value: 5000,
  suggestedValue: 5000,
} as RecurringMovementView

describe('launchValueOf', () => {
  it('launches the value of a fixed one and the typed or suggested value of a variable one', () => {
    expect(launchValueOf(rent, 5)).toBe(1200)
    expect(launchValueOf(energy, 150)).toBe(150)
    expect(launchValueOf(energy, undefined)).toBe(210)
    expect(launchValueOf(energy, null)).toBe(210)
  })
})

describe('useRecurringLaunchStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('lists the ones that did not end, by name, of the chosen period', async () => {
    vi.mocked(recurringMovementsApi.findAll).mockResolvedValue({
      content: [rent],
      page: { size: 15, number: 0, totalElements: 1, totalPages: 1 },
    })
    const store = useRecurringLaunchStore()
    store.filters = { period: 'p-1' }

    await store.findAll()

    expect(recurringMovementsApi.findAll).toHaveBeenCalledWith({
      ended: false,
      financialPeriod: 'p-1',
      page: 0,
      size: 15,
      sort: 'name,asc',
    })
    expect(store.pageResponse.content).toEqual([rent])
    expect(store.loading).toBe(false)
  })

  it('asks with no period while none is chosen and stops loading on failure', async () => {
    vi.mocked(recurringMovementsApi.findAll).mockRejectedValue(new Error('boom'))
    const store = useRecurringLaunchStore()

    await expect(store.findAll()).rejects.toThrow('boom')

    expect(recurringMovementsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ financialPeriod: undefined }),
    )
    expect(store.loading).toBe(false)
  })

  it('sums the effect of the selection by type, with the typed value of the variable one', () => {
    const store = useRecurringLaunchStore()

    store.toggle(rent, true)
    store.toggle(energy, true)
    store.toggle(salary, true)
    expect(store.effect).toBe(5000 - 1200 - 210)

    store.type('r-2', 100)
    expect(store.effect).toBe(5000 - 1200 - 100)

    store.toggle(rent, false)
    expect(store.selected.map((item) => item.id)).toEqual(['r-2', 'r-3'])
    expect(store.effect).toBe(5000 - 100)
  })

  it('launches the selection, with a value only for the variable ones', async () => {
    const report = { launched: [], skipped: [] }
    vi.mocked(recurringMovementsApi.launch).mockResolvedValue(report)
    const store = useRecurringLaunchStore()
    store.toggle(rent, true)
    store.toggle(energy, true)
    store.type('r-2', 150)

    await expect(store.launch('p-1')).resolves.toEqual(report)

    expect(recurringMovementsApi.launch).toHaveBeenCalledWith('p-1', [
      { id: 'r-1' },
      { id: 'r-2', value: 150 },
    ])
  })

  it('suggests the value when the typed one was cleared', async () => {
    vi.mocked(recurringMovementsApi.launch).mockResolvedValue({ launched: [], skipped: [] })
    const store = useRecurringLaunchStore()
    store.toggle(energy, true)
    store.type('r-2', null)

    await store.launch('p-1')

    expect(recurringMovementsApi.launch).toHaveBeenCalledWith('p-1', [{ id: 'r-2', value: 210 }])
  })

  it('forgets the selection and what was typed', () => {
    const store = useRecurringLaunchStore()
    store.filters = { period: 'p-1' }
    store.toggle(energy, true)
    store.type('r-2', 100)

    store.clearSelection()
    expect(store.selected).toEqual([])
    expect(store.typedValues).toEqual({})

    store.toggle(energy, true)
    store.reset()
    expect(store.filters).toEqual({})
    expect(store.selected).toEqual([])
  })
})
