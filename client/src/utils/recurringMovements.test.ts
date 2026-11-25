import { describe, expect, it } from 'vitest'
import {
  displayedValue,
  extraLaunchInstallments,
  installmentProgress,
  isLaunchedIn,
  maxExtraLaunches,
  monthAndYear,
  toneOf,
} from '@/utils/recurringMovements'

describe('installmentProgress', () => {
  it('has no progress without a deadline', () => {
    expect(installmentProgress({ installments: null, launchedInstallments: 3 })).toBeNull()
  })

  it('has no progress when the server leaves the deadline out', () => {
    expect(installmentProgress({})).toBeNull()
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

describe('displayedValue and toneOf', () => {
  it('shows the value of a fixed one and the suggestion of a variable one', () => {
    expect(displayedValue({ valueKind: 'FIXED', value: 100, suggestedValue: 80 })).toBe(100)
    expect(displayedValue({ valueKind: 'VARIABLE', value: 100, suggestedValue: 80 })).toBe(80)
  })

  it('colors the value by the type', () => {
    expect(toneOf({ type: 'INCOME' })).toBe('income')
    expect(toneOf({ type: 'EXPENSE' })).toBe('expense')
  })
})

describe('monthAndYear', () => {
  it('keeps the month and the year of a date or a date with time', () => {
    expect(monthAndYear('2026-11-01')).toBe('11/2026')
    expect(monthAndYear('2026-01-24T10:00:00')).toBe('01/2026')
  })
})

describe('isLaunchedIn', () => {
  it('is launched only when the server names the movement', () => {
    expect(isLaunchedIn({ launchedInPeriod: 'm-1' })).toBe(true)
    expect(isLaunchedIn({ launchedInPeriod: null })).toBe(false)
    expect(isLaunchedIn({})).toBe(false)
  })
})

describe('maxExtraLaunches', () => {
  it('is the installments left of a deadline recurring movement', () => {
    expect(maxExtraLaunches({ installments: 4, nextInstallment: 3 })).toBe(2)
    expect(maxExtraLaunches({ installments: 4, nextInstallment: 1 })).toBe(4)
  })

  it('is zero once the deadline is over and twelve without one', () => {
    expect(maxExtraLaunches({ installments: 4 })).toBe(0)
    expect(maxExtraLaunches({ installments: null, nextInstallment: 7 })).toBe(12)
    expect(maxExtraLaunches({})).toBe(12)
  })
})

describe('extraLaunchInstallments', () => {
  it('counts from the next installment', () => {
    expect(extraLaunchInstallments({ nextInstallment: 3 }, 2)).toEqual([3, 4])
  })

  it('starts at one when the server leaves the next installment out', () => {
    expect(extraLaunchInstallments({}, 2)).toEqual([1, 2])
  })
})
