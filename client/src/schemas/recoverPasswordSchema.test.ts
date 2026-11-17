import { beforeAll, describe, expect, it } from 'vitest'
import { recoverPasswordFormSchema } from '@/schemas/recoverPasswordSchema'
import { installZodErrorMap } from '@/schemas/zodErrorMap'

describe('recoverPasswordFormSchema', () => {
  beforeAll(() => {
    installZodErrorMap()
  })

  it('accepts matching passwords', async () => {
    const result = await recoverPasswordFormSchema.parse({
      password: 'secret',
      confirmation: 'secret',
    })

    expect(result.errors).toEqual([])
  })

  it('requires at least three characters', async () => {
    const result = await recoverPasswordFormSchema.parse({ password: 'ab', confirmation: 'ab' })

    expect(result.errors).toEqual([{ path: 'password', errors: ['Informe ao menos 3 caracteres'] }])
  })

  it('rejects a confirmation that differs from the password', async () => {
    const result = await recoverPasswordFormSchema.parse({
      password: 'secret',
      confirmation: 'other',
    })

    expect(result.errors).toEqual([
      { path: 'confirmation', errors: ['A confirmação deve ser igual à senha'] },
    ])
  })
})
