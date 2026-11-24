import { describe, expect, it } from 'vitest'
import {
  cardPurchaseSchema,
  toCardPurchaseCreateForm,
  toCardPurchaseFormValues,
  toCardPurchaseUpdateForm,
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
}

describe('cardPurchaseSchema', () => {
  it('needs the card, the period, the name, a positive value and the classification', () => {
    expect(cardPurchaseSchema.safeParse(values).success).toBe(true)
    expect(cardPurchaseSchema.safeParse({ ...values, value: 0 }).success).toBe(false)
    expect(cardPurchaseSchema.safeParse({ ...values, card: '' }).success).toBe(false)
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

    expect(toCardPurchaseFormValues(purchase)).toEqual({ ...values, purchasedOn: '2026-11-02' })
  })
})
