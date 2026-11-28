import { describe, expect, it } from 'vitest'
import type { OverviewPeriod } from '@/types'
import {
  axisScale,
  cutOf,
  flowPeriods,
  formatRate,
  formatShare,
  hasMovement,
  monthLabel,
  periodLabel,
  periodRange,
  reserveMeterWidth,
  reserveShare,
  resultScale,
} from '@/utils/overview'

function period(
  name: string,
  endingAt: string,
  revenues: number,
  expenses: number,
  recorded = true,
): OverviewPeriod {
  return {
    financialPeriod: { id: name, name, startingAt: endingAt, endingAt },
    revenues,
    expenses,
    result: revenues - expenses,
    recorded,
  }
}

describe('overview utils', () => {
  it('names the month in the locale without the abbreviation dot', () => {
    expect(monthLabel('2026-08-31', 'pt-BR')).toBe('ago')
    expect(monthLabel('2026-09-30', 'pt-BR')).toBe('set')
    expect(monthLabel('2026-09-30', 'en-US')).toBe('sep')
  })

  it('writes the period as the month and the year', () => {
    expect(periodLabel('2026-11-30', 'pt-BR')).toBe('Nov/2026')
    expect(periodLabel('2026-05-31', 'pt-BR')).toBe('Mai/2026')
  })

  it('tells a period with movement from an empty one', () => {
    expect(hasMovement(period('a', '2026-01-31', 1, 0))).toBe(true)
    expect(hasMovement(period('a', '2026-01-31', 0, 1))).toBe(true)
    expect(hasMovement(period('a', '2026-01-31', 0, 0))).toBe(false)
  })

  it('reads the cut of the URL: all, a year from 1900 to 9999, or else the current year', () => {
    expect(cutOf('all', 2026)).toBe('all')
    expect(cutOf('2024', 2026)).toBe(2024)
    expect(cutOf('1900', 2026)).toBe(1900)
    expect(cutOf('9999', 2026)).toBe(9999)
    expect(cutOf('', 2026)).toBe(2026)
    expect(cutOf('abc', 2026)).toBe(2026)
    expect(cutOf('20.5', 2026)).toBe(2026)
    expect(cutOf('1899', 2026)).toBe(2026)
    expect(cutOf('10000', 2026)).toBe(2026)
  })

  it('writes the dates of a period as day and month, in the locale', () => {
    expect(periodRange('2026-10-15', '2026-11-14', 'pt-BR')).toBe('15/10 – 14/11')
    expect(periodRange('2026-10-15', '2026-11-14', 'en-US')).toBe('10/15 – 11/14')
  })

  it('gives one slot per period, named by month and year, with the dates of the period', () => {
    const slots = flowPeriods(
      [period('Dez', '2025-12-31', 100, 40), period('Jan', '2026-01-31', 0, 0, false)],
      'pt-BR',
    )

    expect(slots).toEqual([
      {
        label: 'dez/25',
        revenues: 100,
        expenses: 40,
        recorded: true,
        periodNames: ['Dez'],
        range: '31/12 – 31/12',
        empty: false,
      },
      {
        label: 'jan/26',
        revenues: 0,
        expenses: 0,
        recorded: false,
        periodNames: ['Jan'],
        range: '31/01 – 31/01',
        empty: true,
      },
    ])
  })

  it('keeps the periods of a year as they were registered, one column each, in the order they start', () => {
    const slots = flowPeriods(
      [
        {
          ...period('Second', '2026-11-14', 50, 5, false),
          financialPeriod: {
            id: 'second',
            name: 'Second',
            startingAt: '2026-10-15',
            endingAt: '2026-11-14',
          },
        },
        {
          ...period('First', '2026-10-14', 100, 10),
          financialPeriod: {
            id: 'first',
            name: 'First',
            startingAt: '2026-10-01',
            endingAt: '2026-10-14',
          },
        },
      ],
      'pt-BR',
    )

    expect(slots.map((slot) => slot.periodNames)).toEqual([['First'], ['Second']])
    expect(slots.map((slot) => slot.range)).toEqual(['01/10 – 14/10', '15/10 – 14/11'])
    expect(slots.map((slot) => slot.label)).toEqual(['out/26', 'nov/26'])
  })

  it('draws nothing for a year without periods', () => {
    expect(flowPeriods([], 'pt-BR')).toEqual([])
  })

  it('names only every third period past eighteen', () => {
    const periods = Array.from({ length: 19 }, (_, index) =>
      period(
        `P${index}`,
        `${2025 + Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}-28`,
        1,
        1,
      ),
    )

    const labels = flowPeriods(periods, 'pt-BR').map((slot) => slot.label)

    expect(labels.slice(0, 4)).toEqual(['jan/25', '', '', 'abr/25'])
    expect(flowPeriods(periods.slice(0, 18), 'pt-BR').every((slot) => slot.label !== '')).toBe(true)
  })

  it('draws four round intervals on the axis', () => {
    expect(axisScale(9600)).toEqual({ step: 2500, max: 10000 })
    expect(axisScale(20000)).toEqual({ step: 5000, max: 20000 })
    expect(axisScale(500)).toEqual({ step: 200, max: 800 })
    expect(axisScale(0)).toEqual({ step: 1, max: 4 })
  })

  it('writes the savings rate with one decimal, signed only when negative', () => {
    expect(formatRate(0.25, 'pt-BR')).toBe('25,0%')
    expect(formatRate(0.0734, 'en-US')).toBe('7.3%')
    expect(formatRate(-0.032, 'pt-BR')).toBe('−3,2%')
    expect(formatRate(0, 'pt-BR')).toBe('0,0%')
    expect(formatRate(null, 'pt-BR')).toBe('—')
  })

  it('spans the result by year from the worst to the best, with room under negative bars', () => {
    expect(resultScale([100, 300])).toEqual({ min: 0, max: 300 })
    expect(resultScale([-100, -300])).toEqual({ min: -342, max: 0 })
    expect(resultScale([100, -100])).toEqual({ min: -128, max: 100 })
    expect(resultScale([0])).toEqual({ min: 0, max: 1 })
    expect(resultScale([])).toEqual({ min: 0, max: 1 })
  })
})

describe('reserve helpers', () => {
  it('writes a share as a rounded percentage, in the locale', () => {
    expect(formatShare(0.6667, 'pt-BR')).toBe('67%')
    expect(formatShare(1.5, 'en-US')).toBe('150%')
    expect(formatShare(0, 'pt-BR')).toBe('0%')
  })

  it('divides the current reserve by the ideal one, counting an ideal of zero as covered', () => {
    expect(reserveShare(6000, 12000)).toBe(0.5)
    expect(reserveShare(18000, 12000)).toBe(1.5)
    expect(reserveShare(0, 0)).toBe(1)
  })

  it('keeps the meter between empty and full', () => {
    expect(reserveMeterWidth(0.5)).toBe(50)
    expect(reserveMeterWidth(1.5)).toBe(100)
    expect(reserveMeterWidth(-0.2)).toBe(0)
  })
})
