import { describe, expect, it } from 'vitest'
import { invoicePaymentDueDate } from '@/utils/invoices'

describe('invoicePaymentDueDate', () => {
  it('uses the payment day of the month the period ends in when it is still ahead', () => {
    expect(invoicePaymentDueDate('2026-11-05', 10)).toBe('2026-11-10')
  })

  it('moves to the next month when the period ends on or after the payment day', () => {
    expect(invoicePaymentDueDate('2026-11-30', 10)).toBe('2026-12-10')
    expect(invoicePaymentDueDate('2026-11-10', 10)).toBe('2026-12-10')
  })

  it('stops at the last day of a short month and rolls over the year', () => {
    expect(invoicePaymentDueDate('2027-01-31', 30)).toBe('2027-02-28')
    expect(invoicePaymentDueDate('2026-12-31', 15)).toBe('2027-01-15')
  })
})
