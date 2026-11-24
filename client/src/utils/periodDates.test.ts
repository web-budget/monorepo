import { describe, expect, it } from 'vitest'
import { nextPeriodDates } from '@/utils/periodDates'

const today = new Date(2026, 10, 24)

describe('nextPeriodDates', () => {
  it('starts the day after the last period and ends with that month', () => {
    expect(nextPeriodDates('2026-12-31', today)).toEqual({
      startingAt: '2027-01-01',
      endingAt: '2027-01-31',
    })
    expect(nextPeriodDates('2027-02-14', today)).toEqual({
      startingAt: '2027-02-15',
      endingAt: '2027-02-28',
    })
  })

  it('takes the current month when there is no period yet', () => {
    expect(nextPeriodDates(null, today)).toEqual({
      startingAt: '2026-11-01',
      endingAt: '2026-11-30',
    })
  })
})
