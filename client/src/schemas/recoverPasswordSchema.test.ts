import { beforeAll, describe, expect, it } from 'vitest'
import { recoverPasswordFormSchema } from '@/schemas/recoverPasswordSchema'
import { installZodErrorMap } from '@/schemas/zodErrorMap'

describe('recoverPasswordFormSchema', () => {
  beforeAll(() => {
    installZodErrorMap()
  })

  it('accepts matching passwords that meet the requirements', async () => {
    const result = await recoverPasswordFormSchema.parse({
      password: 'Caderno1',
      confirmation: 'Caderno1',
    })

    expect(result.errors).toEqual([])
  })

  it('requires a password that meets the requirements', async () => {
    const result = await recoverPasswordFormSchema.parse({
      password: 'caderno',
      confirmation: 'caderno',
    })

    expect(result.errors).toEqual([
      { path: 'password', errors: ['A senha não atende aos requisitos'] },
    ])
  })

  it('rejects a confirmation that differs from the password', async () => {
    const result = await recoverPasswordFormSchema.parse({
      password: 'Caderno1',
      confirmation: 'other',
    })

    expect(result.errors).toEqual([
      { path: 'confirmation', errors: ['A confirmação deve ser igual à senha'] },
    ])
  })
})
