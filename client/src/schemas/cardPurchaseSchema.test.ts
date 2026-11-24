import { describe, expect, it } from 'vitest'
import {
  cardPurchaseSchema,
  toCardPurchaseCreateForm,
  toCardPurchaseFormValues,
  toCardPurchaseUpdateForm,
  toInstallmentRecurringForm,
} from '@/schemas/cardPurchaseSchema'
import type { CardPurchaseView } from '@/types'

const values = {
  card: 'c-1',
  financialPeriod: 'p-1',
  name: 'Mercado',
  purchasedOn: ' ',
  value: 10,
  costCenter: 'cc-1',
  classification: 'cl-1',
  installmentPurchase: false,
  installments: null,
}

const installmentValues = {
  ...values,
  value: null,
  installmentPurchase: true,
  installments: 12,
  installmentValue: 249.9,
}

function issuePaths(input: unknown) {
  const result = cardPurchaseSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))
}

describe('cardPurchaseSchema', () => {
  it('needs the card, the period, the name, a positive value and the classification', () => {
    expect(cardPurchaseSchema.safeParse(values).success).toBe(true)
    expect(cardPurchaseSchema.safeParse({ ...values, value: 0 }).success).toBe(false)
    expect(cardPurchaseSchema.safeParse({ ...values, card: '' }).success).toBe(false)
  })

  it('needs the value of a plain purchase but not of an installment plan', () => {
    expect(issuePaths({ ...values, value: null })).toEqual(['value'])
    expect(issuePaths({ ...values, value: undefined })).toEqual(['value'])
    expect(cardPurchaseSchema.safeParse(installmentValues).success).toBe(true)
  })

  it('needs the installments and the value of each one for an installment plan', () => {
    expect(issuePaths({ ...installmentValues, installments: null })).toEqual(['installments'])
    expect(issuePaths({ ...installmentValues, installments: 1 })).toEqual(['installments'])
    expect(issuePaths({ ...installmentValues, installmentValue: null })).toEqual([
      'installmentValue',
    ])
    expect(issuePaths({ ...installmentValues, installmentValue: undefined })).toEqual([
      'installmentValue',
    ])
  })

  it('ignores the installments of a plain purchase', () => {
    expect(cardPurchaseSchema.safeParse({ ...values, installments: 1 }).success).toBe(true)
  })

  it('sends a blank date as null and keeps only what each call takes', () => {
    expect(toCardPurchaseCreateForm(values)).toEqual({
      name: 'Mercado',
      purchasedOn: null,
      value: 10,
      card: 'c-1',
      financialPeriod: 'p-1',
      classification: 'cl-1',
      costCenter: 'cc-1',
    })
    expect(toCardPurchaseUpdateForm({ ...values, purchasedOn: '2026-11-02' })).toEqual({
      name: 'Mercado',
      purchasedOn: '2026-11-02',
      value: 10,
      classification: 'cl-1',
      costCenter: 'cc-1',
    })
  })

  it('turns an installment plan into a fixed recurring expense on the card', () => {
    expect(toInstallmentRecurringForm(installmentValues)).toEqual({
      name: 'Mercado',
      type: 'EXPENSE',
      valueKind: 'FIXED',
      value: 249.9,
      installments: 12,
      firstInstallment: 1,
      autoLaunch: true,
      classification: 'cl-1',
      costCenter: 'cc-1',
      card: 'c-1',
    })
  })

  it('reads the form values from a purchase', () => {
    const purchase = {
      name: 'Mercado',
      purchasedOn: '2026-11-02',
      value: 10,
      card: { id: 'c-1' },
      financialPeriod: { id: 'p-1' },
      costCenter: { id: 'cc-1' },
      classification: { id: 'cl-1' },
    } as CardPurchaseView

    expect(toCardPurchaseFormValues(purchase)).toEqual({
      card: 'c-1',
      financialPeriod: 'p-1',
      name: 'Mercado',
      purchasedOn: '2026-11-02',
      value: 10,
      costCenter: 'cc-1',
      classification: 'cl-1',
      installmentPurchase: false,
    })
  })
})
