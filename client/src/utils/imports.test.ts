import { describe, expect, it } from 'vitest'
import {
  destinationName,
  destinationValue,
  fileSize,
  importErrorCode,
  retryQuery,
} from '@/utils/imports'

const card = { id: 'c-1', name: 'Visa Platinum', lastFourDigits: '4821' }
const wallet = { id: 'w-1', name: 'Conta corrente' }
const financialPeriod = { id: 'p-11' }

describe('imports utils', () => {
  it('keeps the known error codes and falls back to the generic one', () => {
    expect(importErrorCode('invalid-ofx-file')).toBe('invalid-ofx-file')
    expect(importErrorCode('something-else')).toBe('import-processing-failed')
    expect(importErrorCode(undefined)).toBe('import-processing-failed')
  })

  it('names the destination by the card with its last digits or by the wallet', () => {
    expect(destinationName({ target: 'CARD', card })).toBe('Visa Platinum ••4821')
    expect(destinationName({ target: 'WALLET', wallet })).toBe('Conta corrente')
    expect(destinationName({ target: 'WALLET' })).toBe('')
  })

  it('writes the destination for the filter in the URL', () => {
    expect(destinationValue('CARD', 'c-1')).toBe('card:c-1')
    expect(destinationValue('WALLET', 'w-1')).toBe('wallet:w-1')
  })

  it('opens the new import with the right kind of destination', () => {
    expect(
      retryQuery({ target: 'WALLET', wallet, financialPeriod, error: 'card-statement-on-wallet' }),
    ).toEqual({ card: '', period: 'p-11' })
    expect(
      retryQuery({ target: 'CARD', card, financialPeriod, error: 'account-statement-on-card' }),
    ).toEqual({ wallet: '', period: 'p-11' })
    expect(
      retryQuery({ target: 'CARD', card, financialPeriod, error: 'invalid-ofx-file' }),
    ).toEqual({ card: 'c-1', period: 'p-11' })
    expect(retryQuery({ target: 'WALLET', wallet, financialPeriod })).toEqual({
      wallet: 'w-1',
      period: 'p-11',
    })
    expect(retryQuery({ target: 'WALLET', financialPeriod })).toEqual({
      wallet: '',
      period: 'p-11',
    })
  })

  it('writes the size of a file in KB, at least 1', () => {
    expect(fileSize(18432)).toBe('18 KB')
    expect(fileSize(10)).toBe('1 KB')
  })
})
