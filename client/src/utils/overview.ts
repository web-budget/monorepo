import type { OverviewPeriod } from '@/types'
import { parseLocalDate } from '@/utils/localDate'

export interface FlowSlot {
  label: string
  revenues: number
  expenses: number
  recorded: boolean
  periodNames: string[]
  range: string
  empty: boolean
}

export type OverviewCut = number | 'all'

const FIRST_YEAR = 1900
const LAST_YEAR = 9999
const SPARSE_LABELS_AFTER = 18
const SPARSE_LABELS_STEP = 3

/** Short month name in the locale without the abbreviation dot: "ago", "set". */
export function monthLabel(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'short' })
    .format(parseLocalDate(date))
    .replace('.', '')
    .toLowerCase()
}

function capitalized(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

/** The period as the table shows it: "Nov/2026". */
export function periodLabel(endingAt: string, locale: string): string {
  return `${capitalized(monthLabel(endingAt, locale))}/${endingAt.slice(0, 4)}`
}

export function hasMovement(period: OverviewPeriod): boolean {
  return period.revenues !== 0 || period.expenses !== 0
}

/** The cut the URL asks for: "all", a year between 1900 and 9999, or the current year. */
export function cutOf(value: string, currentYear: number): OverviewCut {
  if (value === 'all') return 'all'
  const year = Number(value)
  return Number.isInteger(year) && year >= FIRST_YEAR && year <= LAST_YEAR ? year : currentYear
}

export function periodRange(startingAt: string, endingAt: string, locale: string): string {
  const format = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' })
  return `${format.format(parseLocalDate(startingAt))} – ${format.format(parseLocalDate(endingAt))}`
}

/**
 * One slot per period, in the order they start, named by the month they end in: "mai/26". Past
 * eighteen periods only every third one is named, so the labels do not pile up.
 */
export function flowPeriods(periods: OverviewPeriod[], locale: string): FlowSlot[] {
  const sparse = periods.length > SPARSE_LABELS_AFTER
  const ordered = [...periods].sort((first, second) =>
    first.financialPeriod.startingAt.localeCompare(second.financialPeriod.startingAt),
  )
  return ordered.map((period, index) => {
    const named = !sparse || index % SPARSE_LABELS_STEP === 0
    const { startingAt, endingAt, name } = period.financialPeriod
    return {
      label: named ? `${monthLabel(endingAt, locale)}/${endingAt.slice(2, 4)}` : '',
      revenues: period.revenues,
      expenses: period.expenses,
      recorded: period.recorded,
      periodNames: [name],
      range: periodRange(startingAt, endingAt, locale),
      empty: !hasMovement(period),
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

export interface ResultScale {
  min: number
  max: number
}

const NEGATIVE_ROOM = 0.14

/**
 * The vertical range of the result by year chart: from the worst year (or zero) to the best (or
 * zero), with room under the bars when a year is negative so the value label fits.
 */
export function resultScale(results: number[]): ResultScale {
  const highest = Math.max(0, ...results)
  const lowest = Math.min(0, ...results)
  const span = highest - lowest || 1
  return {
    min: lowest < 0 ? lowest - span * NEGATIVE_ROOM : 0,
    max: highest > 0 ? highest : lowest < 0 ? 0 : 1,
  }
}

export function formatShare(share: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(share)
}

export function reserveShare(current: number, ideal: number): number {
  return ideal > 0 ? current / ideal : 1
}

export function reserveMeterWidth(share: number): number {
  return Math.min(100, Math.max(0, share * 100))
}

/** The savings rate as the screen writes it: "25,0%", "−3,2%" when negative, "—" without revenues. */
export function formatRate(rate: number | null, locale: string): string {
  if (rate === null) return '—'
  const text = new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(rate))
  return rate < 0 ? `−${text}` : text
}
