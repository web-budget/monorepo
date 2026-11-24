import { formatLocalDate, parseLocalDate } from '@/utils/localDate'

export function invoicePaymentDueDate(periodEnd: string, paymentDay: number): string {
  const end = parseLocalDate(periodEnd)
  const month = end.getDate() >= paymentDay ? end.getMonth() + 1 : end.getMonth()
  const lastDay = new Date(end.getFullYear(), month + 1, 0).getDate()
  return formatLocalDate(new Date(end.getFullYear(), month, Math.min(paymentDay, lastDay)))
}

export function periodMonth(periodName: string): string {
  return periodName.replace(/ de .*$/, '')
}

export function cardLabel(card: { name: string; lastFourDigits: string }): string {
  return `${card.name} ••${card.lastFourDigits}`
}

export function dayAndMonth(isoDate: string): string {
  const [, month, day] = isoDate.split('-')
  return `${day}/${month}`
}
