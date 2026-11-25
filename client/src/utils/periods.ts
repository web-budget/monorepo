import type { FinancialPeriodListView } from '@/types'

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
