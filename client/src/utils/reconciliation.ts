import { ApiError } from '@/api/client'
import type { ReconciliationCompartmentView } from '@/types'

export type FormatAmount = (amount: number, key: string) => string

export interface BalanceChange {
  balance: number
  difference: number
  freeBalance: number
  compartments: ReconciliationCompartmentView[]
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

function compartmentsOf(value: unknown): ReconciliationCompartmentView[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.flatMap((item: Partial<ReconciliationCompartmentView>) => {
    const balance = Number(item.balance)
    return typeof item.id === 'string' && typeof item.name === 'string' && Number.isFinite(balance)
      ? [{ id: item.id, name: item.name, balance }]
      : []
  })
}

export function balanceChangeOf(error: unknown): BalanceChange | null {
  if (!(error instanceof ApiError) || error.error !== BALANCE_CHANGED) {
    return null
  }
  const balance = Number(error.parameters?.currentBalance)
  const difference = Number(error.parameters?.difference)
  if (!Number.isFinite(balance) || !Number.isFinite(difference)) {
    return null
  }
  const freeBalance = Number(error.parameters?.freeBalance)
  return {
    balance,
    difference,
    freeBalance: Number.isFinite(freeBalance) ? freeBalance : balance,
    compartments: compartmentsOf(error.parameters?.compartments),
  }
}
