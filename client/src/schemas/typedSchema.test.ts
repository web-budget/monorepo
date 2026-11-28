import { beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { toTypedSchema } from '@/schemas/typedSchema'
import { installZodErrorMap } from '@/schemas/zodErrorMap'

describe('toTypedSchema', () => {
  beforeAll(() => {
    installZodErrorMap()
  })

  const schema = z.object({
    name: z.string().min(1),
    tags: z.array(z.object({ label: z.string().min(1) })),
    note: z.string().optional(),
    active: z.boolean().default(true),
  })

  it('marks itself as a vee-validate typed schema', () => {
    expect(toTypedSchema(schema).__type).toBe('VVTypedSchema')
  })

  it('returns the parsed value when valid', async () => {
    const result = await toTypedSchema(schema).parse({ name: 'a', tags: [] })

    expect(result.errors).toEqual([])
    expect(result.value).toEqual({ name: 'a', tags: [], active: true })
  })

  it('groups the messages by field, using bracket paths for indexes', async () => {
    const result = await toTypedSchema(schema).parse({ name: '', tags: [{ label: '' }] })

    expect(result.value).toBeUndefined()
    expect(result.errors).toEqual([
      { path: 'name', errors: ['Campo obrigatório'] },
      { path: 'tags[0].label', errors: ['Campo obrigatório'] },
    ])
  })

  it('reports cross-field issues on the path they were raised for', async () => {
    const crossed = z
      .object({ a: z.string(), b: z.string() })
      .refine(({ a, b }) => a === b, { path: ['b'], params: { i18n: 'password-mismatch' } })

    const result = await toTypedSchema(crossed).parse({ a: 'x', b: 'y' })

    expect(result.errors).toEqual([{ path: 'b', errors: ['A confirmação deve ser igual à senha'] }])
  })

  it('flattens union issues', async () => {
    const union = z.object({ value: z.union([z.string(), z.number()]) })

    const result = await toTypedSchema(union).parse({ value: true } as never)

    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors.every((error) => error.path === 'value')).toBe(true)
  })

  it('keeps only the member issues of a union at the root', async () => {
    const union = z.union([z.string(), z.number()])

    const result = await toTypedSchema(union).parse(true as never)

    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors.every((error) => error.path === '')).toBe(true)
  })

  it('reports an issue without a path under an empty path', async () => {
    const root = z.string().refine(() => false, { params: { i18n: 'email' } })

    const result = await toTypedSchema(root).parse('x')

    expect(result.errors).toEqual([{ path: '', errors: ['Informe um e-mail válido'] }])
  })

  it('casts valid values as they are', () => {
    const typed = toTypedSchema(schema)

    expect(typed.cast?.({ name: 'a', tags: [] })).toEqual({ name: 'a', tags: [], active: true })
  })

  it('casts invalid values by merging them over the schema defaults', () => {
    const typed = toTypedSchema(
      z.object({ name: z.string().min(3), active: z.boolean().default(true) }),
    )

    expect(typed.cast?.({ name: 'a' })).toEqual({ name: 'a', active: true })
  })

  it('merges nested objects when casting', () => {
    const typed = toTypedSchema(
      z.object({
        child: z.object({ a: z.string().default('x'), b: z.string().min(2) }),
      }),
    )

    expect(typed.cast?.({ child: { b: 'z' } })).toEqual({ child: { a: 'x', b: 'z' } })
  })

  it('ignores keys that would pollute the prototype when merging', () => {
    const typed = toTypedSchema(
      z.object({ name: z.string().min(3), active: z.boolean().default(true) }),
    )
    const values = JSON.parse('{"name":"a","__proto__":{"polluted":true},"constructor":{"x":1}}')

    const result = typed.cast?.(values) as Record<string, unknown>

    expect(result).toEqual({ name: 'a', active: true })
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    expect(Object.keys(result)).not.toContain('constructor')
  })

  it('returns the values untouched when there are no defaults to merge', () => {
    const typed = toTypedSchema(z.string().min(3))

    expect(typed.cast?.('ab' as never)).toBe('ab')
  })

  it('describes the schema and its fields', () => {
    const typed = toTypedSchema(schema)

    expect(typed.describe?.()).toEqual({ required: true, exists: true })
    expect(typed.describe?.('name')).toEqual({ required: true, exists: true })
    expect(typed.describe?.('note')).toEqual({ required: false, exists: true })
    expect(typed.describe?.('tags[0].label')).toEqual({ required: true, exists: true })
    expect(typed.describe?.('missing' as never)).toEqual({ required: false, exists: false })
    expect(typed.describe?.('name.deeper' as never)).toEqual({ required: false, exists: false })
  })
})
