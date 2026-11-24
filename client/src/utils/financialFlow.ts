import type { FinancialFlowPeriod } from '@/types'
import { parseLocalDate } from '@/utils/localDate'

export interface FlowMonth {
  label: string
  revenues: number
  expenses: number
  recorded: boolean
  periodNames: string[]
  empty: boolean
}

const MONTHS_IN_YEAR = 12

/** Short month name in the locale without the abbreviation dot: "ago", "set". */
export function monthLabel(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'short' })
    .format(parseLocalDate(date))
    .replace('.', '')
    .toLowerCase()
}

/** The period as the table shows it: "Nov/2026". */
export function periodLabel(endingAt: string, locale: string): string {
  const month = monthLabel(endingAt, locale)
  return `${month.charAt(0).toUpperCase()}${month.slice(1)}/${endingAt.slice(0, 4)}`
}

export function hasMovement(period: FinancialFlowPeriod): boolean {
  return period.revenues !== 0 || period.expenses !== 0
}

/**
 * The twelve months of the year for the chart. A month holds the periods that end in it, summed,
 * and counts as recorded only when all of them are; a month without movement is empty.
 */
export function flowMonths(periods: FinancialFlowPeriod[], locale: string): FlowMonth[] {
  return Array.from({ length: MONTHS_IN_YEAR }, (_, index) => {
    const inMonth = periods.filter(
      (period) => parseLocalDate(period.financialPeriod.endingAt).getMonth() === index,
    )
    const revenues = inMonth.reduce((total, period) => total + period.revenues, 0)
    const expenses = inMonth.reduce((total, period) => total + period.expenses, 0)
    return {
      label: monthLabel(`2000-${String(index + 1).padStart(2, '0')}-01`, locale),
      revenues,
      expenses,
      recorded: inMonth.every((period) => period.recorded),
      periodNames: inMonth.map((period) => period.financialPeriod.name),
      empty: revenues === 0 && expenses === 0,
    }
  })
}

const AXIS_INTERVALS = 4
const NICE_STEPS = [1, 2, 2.5, 5, 10]

/** A y axis of four equal intervals with round steps (0, 2.500, 5.000…), as the design draws it. */
export function axisScale(largest: number): { step: number; max: number } {
  const raw = Math.max(largest, AXIS_INTERVALS) / AXIS_INTERVALS
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = NICE_STEPS.map((nice) => nice * magnitude).find((candidate) => candidate >= raw)!
  return { step, max: step * AXIS_INTERVALS }
}
