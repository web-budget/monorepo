const MAXIMUM_DIGITS = 13
const CENTS_PER_UNIT = 100

export function parseMoneyInput(text: string, displayed: string): number | null {
  const digits = text.replace(/\D/g, '').slice(0, MAXIMUM_DIGITS)
  if (digits === '') {
    return null
  }
  const amount = Number(digits) / CENTS_PER_UNIT
  return amount === 0 && text.length < displayed.length ? null : amount
}
