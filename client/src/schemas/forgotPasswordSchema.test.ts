import { beforeAll, describe, expect, it } from 'vitest'
import { forgotPasswordFormSchema } from '@/schemas/forgotPasswordSchema'
import { installZodErrorMap } from '@/schemas/zodErrorMap'

describe('forgotPasswordFormSchema', () => {
  beforeAll(() => {
    installZodErrorMap()
  })

  it('accepts an email', async () => {
    const result = await forgotPasswordFormSchema.parse({ email: 'user@example.com' })

    expect(result.errors).toEqual([])
  })

  it('rejects an invalid email', async () => {
    const result = await forgotPasswordFormSchema.parse({ email: 'nope' })

    expect(result.errors).toEqual([{ path: 'email', errors: ['Informe um e-mail válido'] }])
  })
})
