import { describe, expect, it } from 'vitest'
import type { OverviewPeriod } from '@/types'
import {
  axisScale,
  cutOf,
  flowMonths,
  flowPeriods,
  formatRate,
  formatShare,
  hasMovement,
  monthLabel,
  periodLabel,
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

  it('always gives the twelve months, capitalized, empty where no period ends', () => {
    const months = flowMonths([period('Nov', '2026-11-30', 100, 40, false)], 'pt-BR')

    expect(months).toHaveLength(12)
    expect(months.map((month) => month.label).slice(0, 3)).toEqual(['Jan', 'Fev', 'Mar'])
    expect(months[10]).toMatchObject({
      revenues: 100,
      expenses: 40,
      recorded: false,
      periodNames: ['Nov'],
      empty: false,
    })
    expect(months[0]).toMatchObject({ revenues: 0, expenses: 0, periodNames: [], empty: true })
  })

  it('sums the periods that end in the same month and records it only when all are recorded', () => {
    const months = flowMonths(
      [
        period('First half', '2026-03-15', 100, 10),
        period('Second half', '2026-03-31', 50, 5, false),
      ],
      'pt-BR',
    )

    expect(months[2]).toMatchObject({
      revenues: 150,
      expenses: 15,
      recorded: false,
      periodNames: ['First half', 'Second half'],
    })
  })

  it('treats a month with only zeroed periods as empty', () => {
    expect(flowMonths([period('Dez', '2026-12-31', 0, 0, false)], 'pt-BR')[11]!.empty).toBe(true)
  })

  it('gives one slot per period for all the periods, named by month and year', () => {
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
        empty: false,
      },
      {
        label: 'jan/26',
        revenues: 0,
        expenses: 0,
        recorded: false,
        periodNames: ['Jan'],
        empty: true,
      },
    ])
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
