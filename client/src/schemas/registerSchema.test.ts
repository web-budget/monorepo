import { beforeAll, describe, expect, it } from 'vitest'
import { registerFormSchema } from '@/schemas/registerSchema'
import { installZodErrorMap } from '@/schemas/zodErrorMap'

const valid = { name: 'Maria', email: 'maria@example.com', password: 'Caderno1' }

describe('registerFormSchema', () => {
  beforeAll(() => {
    installZodErrorMap()
  })

  it('accepts a complete registration', async () => {
    const result = await registerFormSchema.parse(valid)

    expect(result.errors).toEqual([])
  })

  it('requires the name and a valid e-mail', async () => {
    const result = await registerFormSchema.parse({ ...valid, name: '  ', email: 'nope' })

    expect(result.errors.map((error) => error.path)).toEqual(['name', 'email'])
  })

  it('requires a password that meets the requirements', async () => {
    const result = await registerFormSchema.parse({ ...valid, password: 'caderno' })

    expect(result.errors).toEqual([
      { path: 'password', errors: ['A senha não atende aos requisitos'] },
    ])
  })

  it('refuses a password the server would cut at 72 bytes', async () => {
    const result = await registerFormSchema.parse({
      ...valid,
      password: `Caderno1${'ç'.repeat(33)}`,
    })

    expect(result.errors).toEqual([
      { path: 'password', errors: ['A senha pode ter no máximo 72 bytes'] },
    ])
  })
})
