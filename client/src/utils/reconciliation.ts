import { ApiError } from '@/api/client'

export type FormatAmount = (amount: number, key: string) => string

export interface BalanceChange {
  balance: number
  difference: number
}

const BALANCE_CHANGED = 'reconciliation-balance-changed'

export function bareAmount(amount: number, format: FormatAmount): string {
  return format(Math.abs(amount), 'currency').replace(/^R\$\s*/, '')
}

export function signedAmount(amount: number, format: FormatAmount): string {
  return `${amount < 0 ? '−' : ''}${bareAmount(amount, format)}`
}

export function reconciliationNotice(
  difference: number,
  walletName: string | undefined,
  format: FormatAmount,
) {
  return {
    detail: difference > 0 ? 'wallet.reconcile.toast.credit' : 'wallet.reconcile.toast.debit',
    params: { name: walletName, amount: bareAmount(difference, format) },
  }
}

export function balanceChangeOf(error: unknown): BalanceChange | null {
  if (!(error instanceof ApiError) || error.error !== BALANCE_CHANGED) {
    return null
  }
  const balance = Number(error.parameters?.currentBalance)
  const difference = Number(error.parameters?.difference)
  return Number.isFinite(balance) && Number.isFinite(difference) ? { balance, difference } : null
}
