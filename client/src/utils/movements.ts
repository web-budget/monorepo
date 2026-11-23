import type { FinancialPeriodListView } from '@/types'
import { formatLocalDate, parseLocalDate } from '@/utils/localDate'

const MILLISECONDS_PER_DAY = 86_400_000

export function daysOverdue(dueDate: string, today: Date = new Date()): number {
  const difference = parseLocalDate(formatLocalDate(today)).getTime() - parseLocalDate(dueDate).getTime()
  return Math.max(0, Math.round(difference / MILLISECONDS_PER_DAY))
}

export function defaultPeriod(
  periods: FinancialPeriodListView[],
  today: Date = new Date(),
): FinancialPeriodListView | undefined {
  const todayText = formatLocalDate(today)
  const open = periods.filter((period) => period.status === 'OPEN')
  const current = open.find(
    (period) => period.startingAt <= todayText && todayText <= period.endingAt,
  )
  if (current) {
    return current
  }
  const latestOpen = [...open].sort((first, second) =>
    second.startingAt.localeCompare(first.startingAt),
  )[0]
  return latestOpen ?? periods[0]
}
