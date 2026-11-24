import type { WalletListView } from '@/types'

export function defaultWallet(wallets: WalletListView[]): WalletListView | undefined {
  return wallets.find((wallet) => wallet.active)
}
