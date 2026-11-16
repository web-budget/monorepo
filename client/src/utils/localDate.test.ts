import { describe, expect, it } from 'vitest'
import { formatLocalDate, parseLocalDate } from './localDate'

describe('parseLocalDate', () => {
  it('reads an ISO date as local midnight', () => {
    const date = parseLocalDate('2026-01-31')

    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([
      2026, 0, 31, 0,
    ])
  })
})

describe('formatLocalDate', () => {
  it('writes the local calendar day as an ISO date', () => {
    expect(formatLocalDate(new Date(2026, 2, 5, 23, 59))).toBe('2026-03-05')
  })

  it('round-trips with parseLocalDate', () => {
    expect(formatLocalDate(parseLocalDate('2025-12-01'))).toBe('2025-12-01')
  })
})
