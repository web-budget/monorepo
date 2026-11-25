import { describe, expect, it } from 'vitest'
import { walletLabel } from '@/utils/walletLabel'

describe('walletLabel', () => {
  it.each([
    [{ name: 'Conta corrente', bank: 'Nubank' }, 'Conta corrente, Nubank'],
    [{ name: 'Carteira', bank: null }, 'Carteira'],
    [{ name: 'Carteira', bank: '' }, 'Carteira'],
    [{ name: 'Carteira' }, 'Carteira'],
  ])('formats %j as %j', (wallet, expected) => {
    expect(walletLabel(wallet)).toBe(expected)
  })
})
