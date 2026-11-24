import { beforeAll, describe, expect, it } from 'vitest'
import { profileFormSchema } from '@/schemas/profileSchema'
import { installZodErrorMap } from '@/schemas/zodErrorMap'

describe('profileFormSchema', () => {
  beforeAll(() => {
    installZodErrorMap()
  })

  it('accepts a name', async () => {
    const result = await profileFormSchema.parse({ name: 'Maria Conceição' })

    expect(result.errors).toEqual([])
  })

  it('requires the name', async () => {
    const result = await profileFormSchema.parse({ name: '   ' })

    expect(result.errors).toEqual([{ path: 'name', errors: ['Campo obrigatório'] }])
  })

  it('limits the name to 100 characters', async () => {
    const result = await profileFormSchema.parse({ name: 'a'.repeat(101) })

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.path).toBe('name')
  })

  it('refuses control characters', async () => {
    const result = await profileFormSchema.parse({ name: 'Ma\nria' })

    expect(result.errors).toEqual([{ path: 'name', errors: ['Valor inválido'] }])
  })
})
