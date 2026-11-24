import type { FinancialPeriodListView } from '@/types'
import { parseLocalDate } from '@/utils/localDate'
import { defaultPeriod } from '@/utils/movements'

export function defaultClosingPeriod(
  periods: FinancialPeriodListView[],
  today: Date = new Date(),
): FinancialPeriodListView | undefined {
  const open = periods.filter((period) => period.status === 'OPEN')
  const oldestExpired = open
    .filter((period) => period.expired)
    .sort((first, second) => first.endingAt.localeCompare(second.endingAt))[0]
  return oldestExpired ?? defaultPeriod(open, today)
}

export function oldestExpired(
  periods: FinancialPeriodListView[],
): FinancialPeriodListView | undefined {
  return periods
    .filter((period) => period.status === 'OPEN' && period.expired)
    .sort((first, second) => first.endingAt.localeCompare(second.endingAt))[0]
}

export function periodMonthName(endingAt: string, locale: string): string {
  const month = new Intl.DateTimeFormat(locale, { month: 'long' }).format(parseLocalDate(endingAt))
  return `${month.charAt(0).toUpperCase()}${month.slice(1)}`
}
