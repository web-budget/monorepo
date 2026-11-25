interface LabeledWallet {
  name: string
  bank?: string | null
}

export function walletLabel(wallet: LabeledWallet): string {
  return wallet.bank ? `${wallet.name}, ${wallet.bank}` : wallet.name
}
