import { describe, expect, it } from 'vitest'
import { importSchema, toImportFormData } from '@/schemas/importSchema'

const file = new File(['ofx'], 'fatura.ofx')

describe('importSchema', () => {
  it('asks for the card of a card import and the wallet of a wallet import', () => {
    const withoutCard = importSchema.safeParse({
      target: 'CARD',
      card: '',
      wallet: 'w-1',
      financialPeriod: 'p-1',
      file,
    })
    const withoutWallet = importSchema.safeParse({
      target: 'WALLET',
      card: 'c-1',
      wallet: '',
      financialPeriod: 'p-1',
      file,
    })

    expect(withoutCard.error?.issues[0]?.path).toEqual(['card'])
    expect(withoutWallet.error?.issues[0]?.path).toEqual(['wallet'])
    expect(
      importSchema.safeParse({
        target: 'CARD',
        card: 'c-1',
        wallet: '',
        financialPeriod: 'p-1',
        file,
      }).success,
    ).toBe(true)
  })

  it('sends the period, the chosen destination and the file', () => {
    const card = toImportFormData({
      target: 'CARD',
      card: 'c-1',
      wallet: 'w-1',
      financialPeriod: 'p-1',
      file,
    })
    const wallet = toImportFormData({
      target: 'WALLET',
      card: 'c-1',
      wallet: 'w-1',
      financialPeriod: 'p-1',
      file,
    })

    expect([...card.keys()]).toEqual(['financialPeriod', 'card', 'file'])
    expect(card.get('card')).toBe('c-1')
    expect([...wallet.keys()]).toEqual(['financialPeriod', 'wallet', 'file'])
    expect((wallet.get('file') as File).name).toBe('fatura.ofx')
  })
})
