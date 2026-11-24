import { formatLocalDate, parseLocalDate } from '@/utils/localDate'

export function nextPeriodDates(lastEndingAt: string | null, today: Date) {
  const start = lastEndingAt
    ? parseLocalDate(lastEndingAt)
    : new Date(today.getFullYear(), today.getMonth(), 0)
  start.setDate(start.getDate() + 1)
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
  return { startingAt: formatLocalDate(start), endingAt: formatLocalDate(end) }
}
