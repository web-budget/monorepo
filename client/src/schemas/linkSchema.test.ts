import { beforeAll, describe, expect, it } from 'vitest'
import { linkFormSchema } from '@/schemas/linkSchema'
import { installZodErrorMap } from '@/schemas/zodErrorMap'

describe('linkFormSchema', () => {
  beforeAll(() => {
    installZodErrorMap()
  })

  it('requires the password of the account', async () => {
    expect((await linkFormSchema.parse({ password: '' })).errors).toEqual([
      { path: 'password', errors: ['Campo obrigatório'] },
    ])
    expect((await linkFormSchema.parse({ password: 'secret' })).errors).toEqual([])
  })
})
