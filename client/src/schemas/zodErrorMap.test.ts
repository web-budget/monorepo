import { beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { installZodErrorMap } from '@/schemas/zodErrorMap'

function firstMessage(schema: z.ZodTypeAny, value: unknown): string | undefined {
  const result = schema.safeParse(value)
  return result.success ? undefined : result.error.issues[0]?.message
}

describe('zodErrorMap', () => {
  beforeAll(() => {
    installZodErrorMap()
  })

  it('asks for a missing value', () => {
    expect(firstMessage(z.string(), undefined)).toBe('Campo obrigatório')
  })

  it('rejects a value of the wrong type', () => {
    expect(firstMessage(z.string(), 5)).toBe('Valor inválido')
  })

  it('treats an empty required string as missing', () => {
    expect(firstMessage(z.string().min(1), '')).toBe('Campo obrigatório')
  })

  it('reports a string that is too short', () => {
    expect(firstMessage(z.string().min(3), 'ab')).toBe('Informe ao menos 3 caracteres')
  })

  it('reports a string that is too long', () => {
    expect(firstMessage(z.string().max(2), 'abc')).toBe('Informe no máximo 2 caracteres')
  })

  it('reports a number below the minimum', () => {
    expect(firstMessage(z.number().min(5), 1)).toBe('O valor mínimo é 5')
  })

  it('reports a number above the maximum', () => {
    expect(firstMessage(z.number().max(5), 9)).toBe('O valor máximo é 5')
  })

  it('reports an invalid email', () => {
    expect(firstMessage(z.string().email(), 'nope')).toBe('Informe um email válido')
  })

  it('reports any other invalid string format', () => {
    expect(firstMessage(z.string().url(), 'nope')).toBe('Valor inválido')
  })

  it('translates a custom issue by the key it carries', () => {
    const schema = z.string().superRefine((_value, context) => {
      context.addIssue({ code: z.ZodIssueCode.custom, params: { i18nKey: 'end-before-start' } })
    })

    expect(firstMessage(schema, 'x')).toBe('A data de fim não pode ser anterior à data de início')
  })

  it('keeps the default message for issues it does not know', () => {
    expect(firstMessage(z.enum(['a']), 'b')).toContain("Invalid enum value. Expected 'a'")
  })
})
