import { beforeEach, describe, expect, it } from 'vitest'
import {
  settingsSchema,
  toInstanceSettingsForm,
  toSettingsFormValues,
} from '@/schemas/settingsSchema'
import { installZodErrorMap } from '@/schemas/zodErrorMap'

function messageFor(reserveMonths: unknown) {
  const result = settingsSchema.safeParse({ reserveMonths })
  return result.success ? null : result.error.issues[0]?.message
}

describe('settingsSchema', () => {
  beforeEach(installZodErrorMap)

  it.each([1, 6, 24])('accepts %i months', (reserveMonths) => {
    expect(settingsSchema.safeParse({ reserveMonths }).success).toBe(true)
  })

  it.each([0, 25, -3, 1.5])('refuses %s with the range message', (reserveMonths) => {
    expect(messageFor(reserveMonths)).toBe('Use um número inteiro de 1 a 24.')
  })

  it.each(['', null, undefined])('asks for the field when it is %j', (reserveMonths) => {
    expect(messageFor(reserveMonths)).toBe('Campo obrigatório')
  })

  it('refuses text that is not a number', () => {
    expect(messageFor('abc')).toBe('Valor inválido')
  })

  it('converts the form values to the payload and back', () => {
    expect(toInstanceSettingsForm({ reserveMonths: 9 })).toEqual({ reserveMonths: 9 })
    expect(toSettingsFormValues({ reserveMonths: 9 })).toEqual({ reserveMonths: 9 })
  })
})
