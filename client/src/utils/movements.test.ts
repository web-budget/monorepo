import { describe, expect, it } from 'vitest'
import type { FinancialPeriodListView } from '@/types'
import { daysOverdue, defaultPeriod } from '@/utils/movements'

function period(id: string, startingAt: string, endingAt: string, status: 'OPEN' | 'CLOSED') {
  return { id, name: id, startingAt, endingAt, status, expired: false } as FinancialPeriodListView
}

describe('daysOverdue', () => {
  const today = new Date(2026, 10, 21, 15, 30)

  it('counts the whole days between the due date and today', () => {
    expect(daysOverdue('2026-11-20', today)).toBe(1)
    expect(daysOverdue('2026-10-31', today)).toBe(21)
  })

  it('is zero for a due date today or in the future', () => {
    expect(daysOverdue('2026-11-21', today)).toBe(0)
    expect(daysOverdue('2026-12-01', today)).toBe(0)
  })

  it('uses the current day when no day is given', () => {
    expect(daysOverdue('2000-01-01')).toBeGreaterThan(0)
  })
})

describe('defaultPeriod', () => {
  const today = new Date(2026, 10, 21)
  const october = period('october', '2026-10-01', '2026-10-31', 'OPEN')
  const november = period('november', '2026-11-01', '2026-11-30', 'OPEN')
  const september = period('september', '2026-09-01', '2026-09-30', 'CLOSED')

  it('picks the open period that contains today', () => {
    expect(defaultPeriod([september, october, november], today)).toBe(november)
  })

  it('picks the latest open period when none contains today', () => {
    expect(defaultPeriod([september, october], today)).toBe(october)
  })

  it('falls back to the first period when none is open', () => {
    expect(defaultPeriod([september], today)).toBe(september)
  })

  it('has no default without periods', () => {
    expect(defaultPeriod([], today)).toBeUndefined()
  })

  it('uses the current day when no day is given', () => {
    expect(defaultPeriod([period('any', '2000-01-01', '2999-12-31', 'OPEN')])?.id).toBe('any')
  })
})
