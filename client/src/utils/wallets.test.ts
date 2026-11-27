import { describe, expect, it } from 'vitest'
import type { WalletListView } from '@/types'
import { defaultWallet } from '@/utils/wallets'

function wallet(id: string, active: boolean): WalletListView {
  return {
    id,
    name: id,
    type: 'BANK_ACCOUNT',
    currentBalance: 0,
    totalBalance: 0,
    compartmentCount: 0,
    bank: null,
    agency: null,
    number: null,
    active,
  }
}

describe('defaultWallet', () => {
  it('is the first active wallet of the list', () => {
    expect(
      defaultWallet([wallet('old', false), wallet('main', true), wallet('spare', true)])?.id,
    ).toBe('main')
  })

  it('is undefined when no wallet is active', () => {
    expect(defaultWallet([wallet('old', false)])).toBeUndefined()
    expect(defaultWallet([])).toBeUndefined()
  })
})
