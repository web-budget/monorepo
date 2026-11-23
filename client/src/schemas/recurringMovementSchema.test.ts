import { describe, expect, it } from 'vitest'
import {
  NO_CARD,
  readjustSchema,
  recurringMovementFormDefaults,
  recurringMovementSchema,
  toRecurringMovementCreateForm,
  toRecurringMovementFormValues,
  toRecurringMovementUpdateForm,
  toRecurringValueForm,
} from '@/schemas/recurringMovementSchema'
import type { RecurringMovementView } from '@/types'

const values = {
  type: 'EXPENSE' as const,
  name: 'Celular',
  valueKind: 'FIXED' as const,
  value: 250,
  costCenter: 'cc-1',
  classification: 'cl-1',
  indefinite: false,
  installments: 12,
  firstInstallment: 1,
  card: 'k-1',
  autoLaunch: true,
  active: true,
}

function issuesOf(candidate: object) {
  const result = recurringMovementSchema.safeParse(candidate)
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))
}

describe('recurringMovementSchema', () => {
  it('accepts an installment recurring movement and an indefinite one', () => {
    expect(issuesOf(values)).toEqual([])
    expect(issuesOf({ ...values, indefinite: true, installments: null })).toEqual([])
  })

  it('asks for the installments when there is a deadline', () => {
    expect(issuesOf({ ...values, installments: null })).toEqual(['installments'])
  })

  it('does not accept a current installment past the last one', () => {
    expect(issuesOf({ ...values, installments: 3, firstInstallment: 4 })).toEqual([
      'firstInstallment',
    ])
    expect(issuesOf({ ...values, firstInstallment: null })).toEqual([])
  })

  it('starts as an indefinite fixed expense', () => {
    expect(recurringMovementFormDefaults()).toMatchObject({
      type: 'EXPENSE',
      valueKind: 'FIXED',
      indefinite: true,
      autoLaunch: false,
    })
  })
})

describe('payloads', () => {
  it('builds the create payload with the deadline and the suggested card', () => {
    expect(toRecurringMovementCreateForm(values)).toEqual({
      name: 'Celular',
      type: 'EXPENSE',
      valueKind: 'FIXED',
      value: 250,
      installments: 12,
      firstInstallment: 1,
      autoLaunch: true,
      classification: 'cl-1',
      costCenter: 'cc-1',
      card: 'k-1',
    })
  })

  it('drops the deadline when indefinite and the card when there is none or it is an income', () => {
    expect(
      toRecurringMovementCreateForm({ ...values, indefinite: true, card: NO_CARD }),
    ).toMatchObject({ installments: null, firstInstallment: null, card: null })
    expect(toRecurringMovementCreateForm({ ...values, type: 'INCOME' })).toMatchObject({
      card: null,
    })
    expect(toRecurringMovementCreateForm({ ...values, card: undefined })).toMatchObject({
      card: null,
    })
  })

  it('builds the update payload without the value and the kind', () => {
    expect(toRecurringMovementUpdateForm({ ...values, active: false })).toEqual({
      name: 'Celular',
      active: false,
      installments: 12,
      autoLaunch: true,
      classification: 'cl-1',
      costCenter: 'cc-1',
      card: 'k-1',
    })
  })

  it('fills the form from the view', () => {
    const view = {
      type: 'EXPENSE',
      name: 'Celular',
      valueKind: 'VARIABLE',
      value: 250,
      installments: null,
      firstInstallment: 1,
      costCenter: { id: 'cc-1', name: 'Casa', fullName: 'Casa' },
      classification: { id: 'cl-1', name: 'Moradia', type: 'EXPENSE' },
      card: null,
      autoLaunch: false,
      active: true,
    } as RecurringMovementView

    expect(toRecurringMovementFormValues(view)).toMatchObject({
      indefinite: true,
      installments: null,
      card: NO_CARD,
      costCenter: 'cc-1',
      classification: 'cl-1',
    })
    expect(
      toRecurringMovementFormValues({
        ...view,
        installments: 6,
        card: { id: 'k-1', name: 'Visa' },
      }),
    ).toMatchObject({ indefinite: false, installments: 6, card: 'k-1' })
  })
})

describe('readjust', () => {
  it('needs a positive value and keeps the reason only when typed', () => {
    expect(readjustSchema.safeParse({ value: 0 }).success).toBe(false)
    expect(toRecurringValueForm({ value: 300, reason: '  IPCA  ' })).toEqual({
      value: 300,
      reason: 'IPCA',
    })
    expect(toRecurringValueForm({ value: 300, reason: '  ' })).toEqual({ value: 300, reason: null })
    expect(toRecurringValueForm({ value: 300 })).toEqual({ value: 300, reason: null })
  })
})
