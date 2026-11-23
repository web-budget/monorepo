import { describe, expect, it } from 'vitest'
import { displayedValue, installmentProgress, signedValue } from '@/utils/recurringMovements'

describe('installmentProgress', () => {
  it('has no progress without a deadline', () => {
    expect(installmentProgress({ installments: null, launchedInstallments: 3 })).toBeNull()
  })

  it('counts the launched installments and the share of the total', () => {
    expect(installmentProgress({ installments: 12, launchedInstallments: 3 })).toEqual({
      current: 3,
      total: 12,
      percentage: 25,
    })
  })

  it('starts at zero before the first launch and never passes the whole', () => {
    expect(installmentProgress({ installments: 4, launchedInstallments: null })).toMatchObject({
      current: 0,
      percentage: 0,
    })
    expect(installmentProgress({ installments: 4, launchedInstallments: 6 })).toMatchObject({
      percentage: 100,
    })
  })
})

describe('displayedValue and signedValue', () => {
  it('shows the value of a fixed one and the suggestion of a variable one', () => {
    expect(displayedValue({ valueKind: 'FIXED', value: 100, suggestedValue: 80 })).toBe(100)
    expect(displayedValue({ valueKind: 'VARIABLE', value: 100, suggestedValue: 80 })).toBe(80)
  })

  it('signs the value by the type', () => {
    const recurringMovement = { valueKind: 'FIXED', value: 100, suggestedValue: 100 } as const
    expect(signedValue({ ...recurringMovement, type: 'INCOME' })).toBe(100)
    expect(signedValue({ ...recurringMovement, type: 'EXPENSE' })).toBe(-100)
  })
})
