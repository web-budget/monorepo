import type { RecurringMovementView } from '@/types'

export interface InstallmentProgress {
  current: number
  total: number
  percentage: number
}

// The server leaves null fields out, so a missing deadline arrives as undefined, not as null.
export function installmentProgress(
  recurringMovement: Pick<RecurringMovementView, 'installments' | 'launchedInstallments'>,
): InstallmentProgress | null {
  const { installments, launchedInstallments } = recurringMovement
  if (installments == null) {
    return null
  }
  const current = launchedInstallments ?? 0
  return { current, total: installments, percentage: Math.min(100, (current / installments) * 100) }
}

export function displayedValue(
  recurringMovement: Pick<RecurringMovementView, 'valueKind' | 'value' | 'suggestedValue'>,
): number {
  return recurringMovement.valueKind === 'VARIABLE'
    ? recurringMovement.suggestedValue
    : recurringMovement.value
}

export function signedValue(
  recurringMovement: Pick<RecurringMovementView, 'type' | 'valueKind' | 'value' | 'suggestedValue'>,
): number {
  const value = displayedValue(recurringMovement)
  return recurringMovement.type === 'INCOME' ? value : -value
}

export function monthAndYear(isoDate: string): string {
  return `${isoDate.slice(5, 7)}/${isoDate.slice(0, 4)}`
}

export function isLaunchedIn(
  recurringMovement: Pick<RecurringMovementView, 'launchedInPeriod'>,
): boolean {
  return recurringMovement.launchedInPeriod != null
}
