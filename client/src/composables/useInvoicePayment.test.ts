import { beforeEach, describe, expect, it, vi } from 'vitest'
import { movementsApi } from '@/api/movements'
import { useInvoicePayment } from '@/composables/useInvoicePayment'
import { pageOf } from '@/test/crud'
import type { InvoiceView, MovementListView, MovementView } from '@/types'

vi.mock('@/api/movements')

const invoice = {
  id: 'i-1',
  status: 'CLOSED',
  financialPeriod: { id: 'p-1' },
} as InvoiceView

describe('useInvoicePayment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not look for a payment of an open invoice', async () => {
    const { payment, load } = useInvoicePayment()

    await load({ ...invoice, status: 'OPEN' })

    expect(movementsApi.findAll).not.toHaveBeenCalled()
    expect(payment.value).toBeNull()
  })

  it('finds, among the invoice payments of the period, the one of this invoice', async () => {
    vi.mocked(movementsApi.findAll).mockResolvedValue(
      pageOf([{ id: 'm-1' }, { id: 'm-2' }] as MovementListView[]),
    )
    vi.mocked(movementsApi.findById).mockImplementation((id) =>
      Promise.resolve({ id, invoice: { id: id === 'm-2' ? 'i-1' : 'i-9' } } as MovementView),
    )
    const { payment, load } = useInvoicePayment()

    await load(invoice)

    expect(movementsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ invoicePayments: true, financialPeriods: ['p-1'] }),
    )
    expect(payment.value?.id).toBe('m-2')
  })

  it('stays without a payment when none belongs to the invoice', async () => {
    vi.mocked(movementsApi.findAll).mockResolvedValue(pageOf([{ id: 'm-1' }] as MovementListView[]))
    vi.mocked(movementsApi.findById).mockResolvedValue({ id: 'm-1', invoice: null } as MovementView)
    const { payment, load } = useInvoicePayment()

    await load(invoice)

    expect(payment.value).toBeNull()
  })
})
