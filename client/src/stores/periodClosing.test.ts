import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { invoicesApi } from '@/api/invoices'
import { movementsApi } from '@/api/movements'
import { periodResultsApi } from '@/api/periodResults'
import { usePeriodClosingStore } from '@/stores/periodClosing'
import type { ClosingSummaryView } from '@/types'

vi.mock('@/api/financialPeriods')
vi.mock('@/api/invoices')
vi.mock('@/api/movements')
vi.mock('@/api/periodResults')

const summary = { canClose: true } as ClosingSummaryView
const result = {
  revenues: 1,
  expenses: 1,
  result: 0,
  recorded: false,
  toPay: 0,
  overdueExpenses: 0,
}
const accumulated = { recorded: 0, provisional: 0, accumulated: 0, provisionalPeriods: [] }

function page(content: object[]) {
  return {
    content,
    page: { size: 100, number: 0, totalElements: content.length, totalPages: 1 },
  } as never
}

function serveLoad(movementIds = ['m-1', 'm-2']) {
  vi.mocked(financialPeriodsApi.findClosing).mockResolvedValue(summary)
  vi.mocked(financialPeriodsApi.findResult).mockResolvedValue(result)
  vi.mocked(periodResultsApi.findAccumulated).mockResolvedValue(accumulated)
  vi.mocked(movementsApi.findAll).mockImplementation((query) =>
    Promise.resolve(
      page(query.invoicePayments ? [{ id: 'm-2' }] : movementIds.map((id) => ({ id }))),
    ),
  )
  vi.mocked(invoicesApi.findAll).mockResolvedValue(page([{ id: 'i-1' }]))
}

describe('usePeriodClosingStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads everything the closing screen needs for a period', async () => {
    serveLoad()
    const store = usePeriodClosingStore()

    await store.load('p-1')

    expect(store.summary).toEqual(summary)
    expect(store.result).toEqual(result)
    expect(store.accumulated).toEqual(accumulated)
    expect(store.pendencies.map((movement) => movement.id)).toEqual(['m-1', 'm-2'])
    expect(store.invoicePaymentIds).toEqual(['m-2'])
    expect(store.invoices.map((invoice) => invoice.id)).toEqual(['i-1'])
    expect(movementsApi.findAll).toHaveBeenCalledWith({
      statuses: ['OPEN'],
      financialPeriods: ['p-1'],
      size: 100,
      sort: 'dueDate,asc',
    })
    expect(invoicesApi.findAll).toHaveBeenCalledWith({ financialPeriod: 'p-1', size: 100 })
    expect(store.loading).toBe(false)
  })

  it('stops loading when the load fails', async () => {
    serveLoad()
    vi.mocked(financialPeriodsApi.findClosing).mockRejectedValue(new Error('boom'))
    const store = usePeriodClosingStore()

    await expect(store.load('p-1')).rejects.toThrow('boom')

    expect(store.loading).toBe(false)
  })

  it('moves a movement, closes the period and closes an invoice', async () => {
    vi.mocked(movementsApi.move).mockResolvedValue({} as never)
    vi.mocked(financialPeriodsApi.close).mockResolvedValue({ ...result, recorded: true })
    vi.mocked(invoicesApi.close).mockResolvedValue({ id: 'i-1' } as never)
    const store = usePeriodClosingStore()

    await store.move('m-1', 'p-2')
    await expect(store.close('p-1')).resolves.toEqual({ ...result, recorded: true })
    await store.closeInvoice('i-1')

    expect(movementsApi.move).toHaveBeenCalledWith('m-1', 'p-2')
    expect(financialPeriodsApi.close).toHaveBeenCalledWith('p-1')
    expect(invoicesApi.close).toHaveBeenCalledWith('i-1')
  })

  it('forgets everything on reset', async () => {
    serveLoad(['m-1'])
    const store = usePeriodClosingStore()
    await store.load('p-1')

    store.reset()

    expect(store.summary).toBeNull()
    expect(store.result).toBeNull()
    expect(store.accumulated).toBeNull()
    expect(store.pendencies).toEqual([])
    expect(store.invoices).toEqual([])
    expect(store.invoicePaymentIds).toEqual([])
  })
})
