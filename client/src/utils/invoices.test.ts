import { describe, expect, it } from 'vitest'
import { cardLabel, dayAndMonth, invoicePaymentDueDate, periodMonth } from '@/utils/invoices'

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

describe('periodMonth', () => {
  it('keeps only the month of a period named "Month of Year"', () => {
    expect(periodMonth('Novembro de 2026')).toBe('Novembro')
  })

  it('keeps the whole name when it has no year', () => {
    expect(periodMonth('Férias')).toBe('Férias')
  })
})

describe('cardLabel', () => {
  it('puts the last digits after the name', () => {
    expect(cardLabel({ name: 'Visa Platinum', lastFourDigits: '4821' })).toBe(
      'Visa Platinum ••4821',
    )
  })
})

describe('dayAndMonth', () => {
  it('drops the year of an ISO date', () => {
    expect(dayAndMonth('2026-12-10')).toBe('10/12')
  })
})
