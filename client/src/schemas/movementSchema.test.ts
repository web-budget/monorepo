import { describe, expect, it } from 'vitest'
import {
  movementFormDefaults,
  movementSchema,
  toMovementCreateForm,
  toMovementFormValues,
  toMovementUpdateForm,
  toPaymentForm,
  type MovementFormValues,
} from '@/schemas/movementSchema'
import type { MovementView } from '@/types'

const values: MovementFormValues = {
  type: 'EXPENSE',
  name: 'Água',
  value: 96.12,
  dueDate: '',
  financialPeriod: 'p-1',
  costCenter: 'cc-1',
  classification: 'cl-1',
  description: ' ',
  paid: false,
  via: 'WALLET',
  paidOn: null,
  wallet: null,
  discount: null,
}

describe('movementSchema', () => {
  it('defaults to an unpaid expense paid today', () => {
    expect(movementFormDefaults()).toMatchObject({ type: 'EXPENSE', paid: false })
  })

  it('accepts an unpaid movement without payment data', () => {
    expect(movementSchema.safeParse(values).success).toBe(true)
  })

  it('asks for the date and the wallet of a paid movement', () => {
    const result = movementSchema.safeParse({ ...values, paid: true, paidOn: '', wallet: null })

    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(['paidOn', 'wallet'])
  })

  it('asks for the card of an expense paid on the card', () => {
    const result = movementSchema.safeParse({
      ...values,
      paid: true,
      paidOn: '2026-11-21',
      via: 'CARD',
      card: null,
    })

    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(['card'])
  })

  it('refuses a discount that reaches the value', () => {
    const result = movementSchema.safeParse({
      ...values,
      paid: true,
      paidOn: '2026-11-21',
      wallet: 'w-1',
      discount: 96.12,
    })

    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(['discount'])
  })

  it('refuses a value that is not positive', () => {
    expect(movementSchema.safeParse({ ...values, value: 0 }).success).toBe(false)
  })
})

describe('movement form conversions', () => {
  it('builds the create form without payment and with blanks as null', () => {
    expect(toMovementCreateForm(values)).toEqual({
      name: 'Água',
      type: 'EXPENSE',
      value: 96.12,
      dueDate: null,
      financialPeriod: 'p-1',
      costCenter: 'cc-1',
      classification: 'cl-1',
      description: null,
      payment: null,
    })
  })

  it('builds the create form with the payment of a paid movement', () => {
    expect(
      toMovementCreateForm({
        ...values,
        paid: true,
        paidOn: '2026-11-21',
        wallet: 'w-1',
        discount: 5,
      }).payment,
    ).toEqual({ wallet: 'w-1', paidOn: '2026-11-21', discount: 5 })
  })

  it('keeps the missing wallet in the payment, since the schema rejects it before the conversion', () => {
    const paidWithoutWallet = { ...values, paid: true, paidOn: '2026-11-21', wallet: null }

    expect(
      movementSchema.safeParse(paidWithoutWallet).error?.issues.map((issue) => issue.path[0]),
    ).toEqual(['wallet'])
    expect(toMovementCreateForm(paidWithoutWallet).payment).toEqual({
      wallet: null,
      paidOn: '2026-11-21',
      discount: null,
    })
  })

  it('pays an income through the wallet whatever the form says about the way', () => {
    expect(
      toMovementCreateForm({
        ...values,
        type: 'INCOME',
        paid: true,
        paidOn: '2026-11-21',
        via: 'CARD',
        wallet: 'w-1',
        card: 'c-1',
      }).payment,
    ).toEqual({ wallet: 'w-1', paidOn: '2026-11-21', discount: null })
  })

  it('falls back to an empty date when a paid movement has none', () => {
    expect(
      toMovementCreateForm({ ...values, paid: true, wallet: 'w-1', paidOn: null }).payment,
    ).toEqual({ wallet: 'w-1', paidOn: '', discount: null })
  })

  it('builds the update form without type and period', () => {
    expect(toMovementUpdateForm({ ...values, dueDate: '2026-11-25' })).toEqual({
      name: 'Água',
      value: 96.12,
      dueDate: '2026-11-25',
      costCenter: 'cc-1',
      classification: 'cl-1',
      description: null,
    })
  })

  it('builds the payment form', () => {
    expect(toPaymentForm({ paidOn: '2026-11-21', wallet: 'w-1', discount: null })).toEqual({
      wallet: 'w-1',
      paidOn: '2026-11-21',
      discount: null,
    })
  })

  it('builds the payment form of a card payment', () => {
    expect(
      toPaymentForm({
        paidOn: '2026-11-21',
        via: 'CARD',
        card: 'k-1',
        wallet: 'w-1',
        discount: null,
      }),
    ).toEqual({ card: 'k-1', paidOn: '2026-11-21', discount: null })
  })

  it('reads a movement back into form values', () => {
    const movement = {
      name: 'Salário',
      type: 'INCOME',
      value: 8400,
      dueDate: '2026-11-05',
      costCenter: { id: 'cc-1' },
      classification: { id: 'cl-2' },
      financialPeriod: { id: 'p-1' },
      description: null,
    } as MovementView

    expect(toMovementFormValues(movement)).toMatchObject({
      type: 'INCOME',
      costCenter: 'cc-1',
      classification: 'cl-2',
      financialPeriod: 'p-1',
      paid: false,
    })
    expect(toMovementFormValues({ ...movement, type: 'EXPENSE' }).type).toBe('EXPENSE')
  })
})
