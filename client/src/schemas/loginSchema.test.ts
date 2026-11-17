import { beforeAll, describe, expect, it } from 'vitest'
import { loginFormSchema } from '@/schemas/loginSchema'
import { installZodErrorMap } from '@/schemas/zodErrorMap'

describe('loginFormSchema', () => {
  beforeAll(() => {
    installZodErrorMap()
  })

  it('accepts valid credentials', async () => {
    const result = await loginFormSchema.parse({ email: 'user@example.com', password: 'secret' })

    expect(result.errors).toEqual([])
    expect(result.value).toEqual({ email: 'user@example.com', password: 'secret' })
  })

  it('reports empty fields with the translated required message', async () => {
    const result = await loginFormSchema.parse({ email: '', password: '' })

    expect(result.errors).toEqual([
      { path: 'email', errors: ['Campo obrigatório', 'Informe um email válido'] },
      { path: 'password', errors: ['Campo obrigatório'] },
    ])
  })

  it('reports an invalid email with the translated message', async () => {
    const result = await loginFormSchema.parse({ email: 'nope', password: 'secret' })

    expect(result.errors).toEqual([{ path: 'email', errors: ['Informe um email válido'] }])
  })
})
