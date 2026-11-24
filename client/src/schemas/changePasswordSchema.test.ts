import { beforeAll, describe, expect, it } from 'vitest'
import { changePasswordFormSchema } from '@/schemas/changePasswordSchema'
import { installZodErrorMap } from '@/schemas/zodErrorMap'

const valid = { currentPassword: 'segredo', newPassword: 'Caderno1', confirmation: 'Caderno1' }

describe('changePasswordFormSchema', () => {
  beforeAll(() => {
    installZodErrorMap()
  })

  it('accepts matching passwords that meet the requirements', async () => {
    const result = await changePasswordFormSchema.parse(valid)

    expect(result.errors).toEqual([])
  })

  it('requires the current password', async () => {
    const result = await changePasswordFormSchema.parse({ ...valid, currentPassword: '' })

    expect(result.errors).toEqual([{ path: 'currentPassword', errors: ['Campo obrigatório'] }])
  })

  it('requires a new password that meets the requirements', async () => {
    const result = await changePasswordFormSchema.parse({
      ...valid,
      newPassword: 'caderno',
      confirmation: 'caderno',
    })

    expect(result.errors).toEqual([
      { path: 'newPassword', errors: ['A senha não atende aos requisitos'] },
    ])
  })

  it('refuses a new password over 72 bytes before the other requirements', async () => {
    const result = await changePasswordFormSchema.parse({
      ...valid,
      newPassword: 'a'.repeat(73),
      confirmation: 'a'.repeat(73),
    })

    expect(result.errors[0]).toEqual({
      path: 'newPassword',
      errors: ['A senha pode ter no máximo 72 bytes', 'A senha não atende aos requisitos'],
    })
  })

  it('counts bytes, not characters', async () => {
    const password = `C1${'ã'.repeat(36)}`
    const result = await changePasswordFormSchema.parse({
      ...valid,
      newPassword: password,
      confirmation: password,
    })

    expect(result.errors).toEqual([
      { path: 'newPassword', errors: ['A senha pode ter no máximo 72 bytes'] },
    ])
  })

  it('rejects a confirmation that differs from the new password', async () => {
    const result = await changePasswordFormSchema.parse({ ...valid, confirmation: 'Caderno2' })

    expect(result.errors).toEqual([
      { path: 'confirmation', errors: ['A confirmação deve ser igual à senha'] },
    ])
  })
})
