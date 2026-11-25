import type { FinancialPeriodListView } from '@/types'
import { parseLocalDate } from '@/utils/localDate'

export function oldestOpen(
  periods: FinancialPeriodListView[],
): FinancialPeriodListView | undefined {
  return periods
    .filter((period) => period.status === 'OPEN')
    .sort((first, second) => first.endingAt.localeCompare(second.endingAt))[0]
}

export function oldestExpired(
  periods: FinancialPeriodListView[],
): FinancialPeriodListView | undefined {
  return periods
    .filter((period) => period.status === 'OPEN' && period.expired)
    .sort((first, second) => first.endingAt.localeCompare(second.endingAt))[0]
}

export function monthOf(name: string | undefined): string {
  return (name ?? '').split(' de ')[0]!
}

export function periodMonthName(endingAt: string, locale: string): string {
  const month = new Intl.DateTimeFormat(locale, { month: 'long' }).format(parseLocalDate(endingAt))
  return `${month.charAt(0).toUpperCase()}${month.slice(1)}`
}
