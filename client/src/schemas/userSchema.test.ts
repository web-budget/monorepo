import { beforeAll, describe, expect, it } from 'vitest'
import {
  toUserCreateForm,
  toUserFormValues,
  toUserUpdateForm,
  userCreateSchema,
  userFormDefaults,
  userPasswordSchema,
  userUpdateSchema,
} from '@/schemas/userSchema'
import { installZodErrorMap } from '@/schemas/zodErrorMap'
import type { UserView } from '@/types'

const valid = {
  ...userFormDefaults,
  name: 'Ana',
  email: 'ana@example.com',
  password: 'secret-123',
  roles: ['REGISTRATION'],
}

function messagesOf(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues.map((issue) => issue.message) ?? []
}

describe('user schemas', () => {
  beforeAll(() => {
    installZodErrorMap()
  })

  it('accepts a complete new user', () => {
    expect(userCreateSchema.safeParse(valid).success).toBe(true)
  })

  it.each([
    ['name', { name: '' }, 'Informe ao menos 2 caracteres'],
    ['email', { email: '' }, 'Campo obrigatório'],
    ['email', { email: 'nope' }, 'Informe um email válido'],
    ['password', { password: 'short' }, 'Informe ao menos 8 caracteres'],
    ['roles', { roles: [] }, 'Campo obrigatório'],
  ])('rejects a new user with an invalid %s', (_field, override, message) => {
    const result = userCreateSchema.safeParse({ ...valid, ...override })

    expect(messagesOf(result)).toContain(message)
  })

  it('does not ask for the e-mail nor the password when editing', () => {
    const result = userUpdateSchema.safeParse({ ...valid, email: '', password: '' })

    expect(result.success).toBe(true)
  })

  it('still asks for at least one role when editing', () => {
    expect(userUpdateSchema.safeParse({ ...valid, roles: [] }).success).toBe(false)
  })

  it('requires the confirmation of the new password to match', () => {
    const mismatch = userPasswordSchema.safeParse({ password: 'secret-123', confirmation: 'other' })

    expect(messagesOf(mismatch)).toEqual(['A confirmação deve ser igual à senha'])
    expect(
      userPasswordSchema.safeParse({ password: 'secret-123', confirmation: 'secret-123' }).success,
    ).toBe(true)
  })
})

describe('user payloads', () => {
  const user: UserView = {
    id: 'u-1',
    active: false,
    name: 'Ana',
    email: 'ana@example.com',
    defaultLanguage: 'EN_US',
    authorities: ['ADMINISTRATION', 'FINANCIAL'],
  }

  it('builds the creation payload, asking for the activation e-mail', () => {
    expect(toUserCreateForm(valid)).toEqual({
      name: 'Ana',
      email: 'ana@example.com',
      password: 'secret-123',
      defaultLanguage: 'PT_BR',
      roles: ['REGISTRATION'],
      sendActivationEmail: true,
    })
  })

  it('builds the update payload without the e-mail and the password', () => {
    expect(toUserUpdateForm({ ...valid, active: false })).toEqual({
      active: false,
      name: 'Ana',
      defaultLanguage: 'PT_BR',
      roles: ['REGISTRATION'],
    })
  })

  it('reads the authorities of a user back as the roles of the form', () => {
    expect(toUserFormValues(user)).toEqual({
      active: false,
      name: 'Ana',
      email: 'ana@example.com',
      defaultLanguage: 'EN_US',
      roles: ['ADMINISTRATION', 'FINANCIAL'],
    })
  })
})
