import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/client'
import {
  balanceChangeOf,
  bareAmount,
  reconciliationNotice,
  signedAmount,
} from '@/utils/reconciliation'

const format = (amount: number) => `R$ ${amount.toFixed(2).replace('.', ',')}`

describe('bareAmount', () => {
  it('drops the currency symbol and the sign', () => {
    expect(bareAmount(12.4, format)).toBe('12,40')
    expect(bareAmount(-35, format)).toBe('35,00')
  })
})

describe('signedAmount', () => {
  it('signs only the negative amount', () => {
    expect(signedAmount(-35, format)).toBe('−35,00')
    expect(signedAmount(12.4, format)).toBe('12,40')
    expect(signedAmount(0, format)).toBe('0,00')
  })
})

describe('reconciliationNotice', () => {
  it('tells the credit of a positive difference', () => {
    expect(reconciliationNotice(12.4, 'Conta corrente', format)).toEqual({
      detail: 'wallet.reconcile.toast.credit',
      params: { name: 'Conta corrente', amount: '12,40' },
    })
  })

  it('tells the debit of a negative difference by its absolute value', () => {
    expect(reconciliationNotice(-35, undefined, format)).toEqual({
      detail: 'wallet.reconcile.toast.debit',
      params: { name: undefined, amount: '35,00' },
    })
  })
})

describe('balanceChangeOf', () => {
  const changed = (parameters?: Record<string, unknown>) =>
    new ApiError({ error: 'reconciliation-balance-changed', parameters }, 409)

  it('reads the new balance and the new difference of the refusal', () => {
    expect(balanceChangeOf(changed({ currentBalance: 5948.16, difference: 48.5 }))).toEqual({
      balance: 5948.16,
      difference: 48.5,
      freeBalance: 5948.16,
      compartments: [],
    })
  })

  it('reads the free balance and the compartments of a wallet with them', () => {
    expect(
      balanceChangeOf(
        changed({
          currentBalance: 1450,
          difference: 10,
          freeBalance: 450,
          compartments: [
            { id: 'c-1', name: 'Reserva da casa', balance: 1000 },
            { id: 'c-2', name: 'Sem saldo', balance: 'x' },
            { id: 3, name: 'Sem id', balance: 1 },
          ],
        }),
      ),
    ).toEqual({
      balance: 1450,
      difference: 10,
      freeBalance: 450,
      compartments: [{ id: 'c-1', name: 'Reserva da casa', balance: 1000 }],
    })
  })

  it('ignores compartments that are not a list', () => {
    expect(
      balanceChangeOf(changed({ currentBalance: 1, difference: 2, compartments: 'x' })),
    ).toEqual({ balance: 1, difference: 2, freeBalance: 1, compartments: [] })
  })

  it('ignores a refusal without the new values', () => {
    expect(balanceChangeOf(changed())).toBeNull()
    expect(balanceChangeOf(changed({ currentBalance: 'x', difference: 1 }))).toBeNull()
  })

  it('ignores any other error', () => {
    expect(balanceChangeOf(new ApiError({ error: 'inactive-wallet' }, 400))).toBeNull()
    expect(balanceChangeOf(new Error('boom'))).toBeNull()
  })
})
