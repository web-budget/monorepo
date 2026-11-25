import { describe, expect, it } from 'vitest'
import {
  launchInPeriodFormSchema,
  NO_CARD,
  readjustSchema,
  recurringMovementFormDefaults,
  recurringMovementSchema,
  toRecurringExtraLaunchForm,
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

  it('starts as a fixed expense in twelve installments, launched automatically', () => {
    expect(recurringMovementFormDefaults()).toMatchObject({
      type: 'EXPENSE',
      valueKind: 'FIXED',
      indefinite: false,
      installments: 12,
      firstInstallment: 1,
      autoLaunch: true,
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
        card: { id: 'k-1', name: 'Visa', lastFourDigits: '4821' },
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

describe('launch in period', () => {
  const errorsOf = async (maximum: number, values: Record<string, unknown>) =>
    (await launchInPeriodFormSchema(maximum).parse(values)).errors.map((error) => error.path)

  it('takes a period, a quantity up to the maximum and an optional value', async () => {
    const parsed = await launchInPeriodFormSchema(2).parse({
      financialPeriod: 'p-1',
      quantity: '2',
      value: '',
    })

    expect(parsed.errors).toEqual([])
    expect(parsed.value).toEqual({ financialPeriod: 'p-1', quantity: 2, value: null })
  })

  it('refuses a missing period and a quantity out of range or not a whole number', async () => {
    expect(await errorsOf(2, { quantity: 1 })).toEqual(['financialPeriod'])
    expect(await errorsOf(2, { financialPeriod: 'p-1' })).toEqual(['quantity'])
    expect(await errorsOf(2, { financialPeriod: 'p-1', quantity: '' })).toEqual(['quantity'])
    expect(await errorsOf(2, { financialPeriod: 'p-1', quantity: 0 })).toEqual(['quantity'])
    expect(await errorsOf(2, { financialPeriod: 'p-1', quantity: 3 })).toEqual(['quantity'])
    expect(await errorsOf(2, { financialPeriod: 'p-1', quantity: 1.5 })).toEqual(['quantity'])
    expect(await errorsOf(2, { financialPeriod: 'p-1', quantity: 1, value: 0 })).toEqual(['value'])
  })

  it('sends the value only for a variable recurring movement', () => {
    const values = { financialPeriod: 'p-1', quantity: 2, value: 98.4 }

    expect(toRecurringExtraLaunchForm(values, true)).toEqual({
      financialPeriod: 'p-1',
      quantity: 2,
      value: 98.4,
    })
    expect(toRecurringExtraLaunchForm(values, false)).toEqual({
      financialPeriod: 'p-1',
      quantity: 2,
    })
    expect(toRecurringExtraLaunchForm({ ...values, value: null }, true)).toEqual({
      financialPeriod: 'p-1',
      quantity: 2,
    })
  })
})
