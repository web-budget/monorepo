import { beforeEach, describe, expect, it } from 'vitest'
import { toTransferForm, transferSchema } from '@/schemas/transferSchema'
import { installZodErrorMap } from '@/schemas/zodErrorMap'

describe('transferSchema', () => {
  beforeEach(installZodErrorMap)

  it('accepts two different wallets and a positive value', () => {
    expect(transferSchema.safeParse({ fromWallet: 'a', toWallet: 'b', value: 10 }).success).toBe(
      true,
    )
  })

  it('refuses the same wallet on both sides, pointing at the destination', () => {
    const result = transferSchema.safeParse({ fromWallet: 'a', toWallet: 'a', value: 10 })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]).toMatchObject({
      path: ['toWallet'],
      message: 'Origem e destino precisam ser carteiras diferentes.',
    })
  })

  it('refuses a value that is not positive', () => {
    expect(transferSchema.safeParse({ fromWallet: 'a', toWallet: 'b', value: 0 }).success).toBe(
      false,
    )
  })

  it('sends a blank note as null', () => {
    const values = { fromWallet: 'a', toWallet: 'b', value: 10 }

    expect(toTransferForm({ ...values, description: ' ' }).description).toBeNull()
    expect(toTransferForm({ ...values, description: 'Aluguel' }).description).toBe('Aluguel')
  })
})
