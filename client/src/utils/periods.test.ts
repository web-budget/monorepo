import { describe, expect, it } from 'vitest'
import type { FinancialPeriodListView } from '@/types'
import { defaultClosingPeriod, monthOf, oldestExpired } from '@/utils/periods'

function period(
  id: string,
  startingAt: string,
  endingAt: string,
  status: 'OPEN' | 'CLOSED',
  expired: boolean,
): FinancialPeriodListView {
  return { id, name: id, startingAt, endingAt, status, expired, reopenable: false }
}

const october = period('october', '2026-10-01', '2026-10-31', 'OPEN', true)
const september = period('september', '2026-09-01', '2026-09-30', 'OPEN', true)
const november = period('november', '2026-11-01', '2026-11-30', 'OPEN', false)
const august = period('august', '2026-08-01', '2026-08-31', 'CLOSED', false)

describe('defaultClosingPeriod', () => {
  it('prefers the oldest expired open period', () => {
    expect(defaultClosingPeriod([november, october, september, august])?.id).toBe('september')
  })

  it('falls back to the open period that holds today', () => {
    expect(defaultClosingPeriod([november, august], new Date(2026, 10, 21))?.id).toBe('november')
  })

  it('has nothing without open periods', () => {
    expect(defaultClosingPeriod([august])).toBeUndefined()
    expect(defaultClosingPeriod([])).toBeUndefined()
  })
})

describe('oldestExpired', () => {
  it('finds the open expired period that ended first', () => {
    expect(oldestExpired([october, september, november])?.id).toBe('september')
  })

  it('ignores closed and unexpired periods', () => {
    expect(oldestExpired([november, august])).toBeUndefined()
  })
})

describe('monthOf', () => {
  it('keeps only the month of a period name', () => {
    expect(monthOf('Outubro de 2026')).toBe('Outubro')
  })

  it('keeps a name that has no year, and an empty one', () => {
    expect(monthOf('Outubro')).toBe('Outubro')
    expect(monthOf(undefined)).toBe('')
  })
})
