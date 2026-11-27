import { describe, expect, it } from 'vitest'
import type { WalletEntryView, WalletListView } from '@/types'
import { defaultStatementWallet, entryLabel } from '@/utils/statement'

const entry = {
  id: 'e-1',
  name: 'Poupança',
  direction: 'DEBIT',
  origin: 'TRANSFER',
  reference: { type: 'TRANSFER', id: 't-1', returnTransfer: false },
} as WalletEntryView

const translate = (key: string, named: Record<string, unknown>) => `${key}:${named.name}`

describe('entryLabel', () => {
  it('keeps the name of an entry that is not a transfer or a reversal', () => {
    expect(entryLabel({ ...entry, origin: 'EXPENSE', name: 'Aluguel' }, translate)).toBe('Aluguel')
  })

  it('says it is a reversal of the movement', () => {
    expect(entryLabel({ ...entry, origin: 'REVERSAL', name: 'Academia' }, translate)).toBe(
      'statement.entry.reversal:Academia',
    )
  })

  it.each([
    ['DEBIT', false, 'statement.entry.transfer-to:Poupança'],
    ['CREDIT', false, 'statement.entry.transfer-from:Poupança'],
    ['DEBIT', true, 'statement.entry.return-to:Poupança'],
    ['CREDIT', true, 'statement.entry.return-from:Poupança'],
  ])('labels a %s transfer line, return %s', (direction, returnTransfer, label) => {
    const line = {
      ...entry,
      direction,
      reference: { type: 'TRANSFER', id: 't-1', returnTransfer },
    } as WalletEntryView

    expect(entryLabel(line, translate)).toBe(label)
  })

  it('treats a transfer line without reference as an ordinary transfer', () => {
    expect(entryLabel({ ...entry, reference: null }, translate)).toBe(
      'statement.entry.transfer-to:Poupança',
    )
  })
})

describe('defaultStatementWallet', () => {
  const wallet = (id: string, name: string, active: boolean, lastEntryOn?: string) =>
    ({ id, name, active, lastEntryOn }) as WalletListView

  it('is the active wallet whose last line is the most recent', () => {
    const wallets = [
      wallet('a', 'Alfa', true, '2026-11-10T10:00:00'),
      wallet('b', 'Beta', true, '2026-11-20T10:00:00'),
      wallet('e', 'Epsilon', true, '2026-11-12T10:00:00'),
      wallet('c', 'Gama', false, '2026-11-21T10:00:00'),
      wallet('d', 'Delta', true),
    ]

    expect(defaultStatementWallet(wallets)?.id).toBe('b')
  })

  it('is the first active wallet in alphabetical order when no wallet has lines', () => {
    const wallets = [
      wallet('b', 'Beta', true),
      wallet('c', 'Gama', false),
      wallet('a', 'Alfa', true),
    ]

    expect(defaultStatementWallet(wallets)?.id).toBe('a')
  })

  it('is nothing without active wallets', () => {
    expect(defaultStatementWallet([wallet('c', 'Gama', false)])).toBeUndefined()
    expect(defaultStatementWallet([])).toBeUndefined()
  })
})
