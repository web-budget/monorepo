import { describe, expect, it } from 'vitest'
import {
  cardLabel,
  dayAndMonth,
  invoicePaymentDueDate,
  periodMonth,
  purchaseDisplayName,
} from '@/utils/invoices'

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

describe('purchaseDisplayName', () => {
  const installment = { installment: 10, installments: 12 }

  it('drops the installment the server appends to the name, since the badge shows it', () => {
    expect(
      purchaseDisplayName({ name: 'Celular novo 10/12', recurringMovement: installment }),
    ).toBe('Celular novo')
  })

  it('keeps a name that does not end with its installment', () => {
    expect(purchaseDisplayName({ name: 'Celular novo', recurringMovement: installment })).toBe(
      'Celular novo',
    )
  })

  it('keeps the name of an open-ended recurring and of a plain purchase', () => {
    expect(
      purchaseDisplayName({
        name: 'Videoflix 4/12',
        recurringMovement: { installment: 4, installments: null },
      }),
    ).toBe('Videoflix 4/12')
    expect(purchaseDisplayName({ name: 'Mercado' })).toBe('Mercado')
    expect(purchaseDisplayName({ name: 'Mercado', recurringMovement: null })).toBe('Mercado')
  })
})
