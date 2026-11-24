import { describe, expect, it } from 'vitest'
import type { FinancialFlowPeriod } from '@/types'
import { axisScale, flowMonths, hasMovement, monthLabel, periodLabel } from '@/utils/financialFlow'

function period(
  name: string,
  endingAt: string,
  revenues: number,
  expenses: number,
  recorded = true,
): FinancialFlowPeriod {
  return {
    financialPeriod: { id: name, name, startingAt: endingAt, endingAt },
    revenues,
    expenses,
    result: revenues - expenses,
    recorded,
  }
}

describe('financialFlow', () => {
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

  it('always gives the twelve months, empty where no period ends', () => {
    const months = flowMonths([period('Nov', '2026-11-30', 100, 40, false)], 'pt-BR')

    expect(months).toHaveLength(12)
    expect(months.map((month) => month.label).slice(0, 3)).toEqual(['jan', 'fev', 'mar'])
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

  it('draws four round intervals on the axis', () => {
    expect(axisScale(9600)).toEqual({ step: 2500, max: 10000 })
    expect(axisScale(20000)).toEqual({ step: 5000, max: 20000 })
    expect(axisScale(500)).toEqual({ step: 200, max: 800 })
    expect(axisScale(0)).toEqual({ step: 1, max: 4 })
  })
})
