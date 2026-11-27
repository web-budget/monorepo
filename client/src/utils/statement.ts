import {
  Box,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CreditCard,
  Scale,
  Undo2,
} from 'lucide-vue-next'
import type { Component } from 'vue'
import type { WalletEntryOrigin, WalletEntryView, WalletListView } from '@/types'

type Translate = (key: string, named: Record<string, unknown>) => string

export const ORIGIN_APPEARANCE: Record<
  WalletEntryOrigin,
  { icon: Component; classes: string; variant: 'highlight' | 'neutral' }
> = {
  INCOME: { icon: ArrowDownLeft, classes: 'bg-income-muted text-income', variant: 'neutral' },
  EXPENSE: { icon: ArrowUpRight, classes: 'bg-expense-muted text-expense', variant: 'neutral' },
  REVERSAL: { icon: Undo2, classes: '', variant: 'highlight' },
  ADJUSTMENT: { icon: Scale, classes: '', variant: 'neutral' },
  TRANSFER: { icon: ArrowLeftRight, classes: 'bg-chart-3/15 text-chart-3', variant: 'neutral' },
  INVOICE_PAYMENT: { icon: CreditCard, classes: 'bg-chart-5/15 text-chart-5', variant: 'neutral' },
  COMPARTMENT: { icon: Box, classes: 'bg-accent text-accent-foreground', variant: 'neutral' },
}

export function entryLabel(entry: WalletEntryView, t: Translate): string {
  if (entry.origin === 'REVERSAL') {
    return t('statement.entry.reversal', { name: entry.name })
  }
  if (entry.origin === 'COMPARTMENT') {
    const kind = entry.direction === 'DEBIT' ? 'deposit' : 'withdrawal'
    return t(`statement.entry.compartment-${kind}`, { name: entry.name })
  }
  if (entry.origin !== 'TRANSFER') {
    return entry.name
  }
  const kind = entry.reference?.returnTransfer ? 'return' : 'transfer'
  const direction = entry.direction === 'DEBIT' ? 'to' : 'from'
  return t(`statement.entry.${kind}-${direction}`, { name: entry.name })
}

export function defaultStatementWallet(wallets: WalletListView[]): WalletListView | undefined {
  const active = wallets.filter((wallet) => wallet.active)
  const withEntries = active.filter((wallet) => wallet.lastEntryOn)
  if (withEntries.length === 0) {
    return [...active].sort((first, second) => first.name.localeCompare(second.name))[0]
  }
  return withEntries.reduce((latest, wallet) =>
    wallet.lastEntryOn! > latest.lastEntryOn! ? wallet : latest,
  )
}

export function adjustmentNotice(
  value: number,
  walletName: string | undefined,
  format: (amount: number, key: string) => string,
) {
  return {
    detail: value > 0 ? 'statement.toast.adjusted-credit' : 'statement.toast.adjusted-debit',
    params: {
      name: walletName,
      amount: format(Math.abs(value), 'currency').replace(/^R\$\s*/, ''),
    },
  }
}
