import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { blankToNull, optionalNumberSchema, optionId, selectedOptionSchema } from '@/schemas/fields'

describe('optionalNumberSchema', () => {
  const schema = optionalNumberSchema()

  it.each([
    ['', null],
    [null, null],
    [undefined, null],
    ['12.5', 12.5],
    [7, 7],
  ])('turns %j into %j', (input, expected) => {
    expect(schema.parse(input)).toBe(expected)
  })

  it('applies the given number rules', () => {
    const limited = optionalNumberSchema(z.number().int().min(1).max(30))

    expect(limited.safeParse('31').success).toBe(false)
    expect(limited.safeParse('1.5').success).toBe(false)
    expect(limited.safeParse('15').success).toBe(true)
  })

  it('rejects text that is not a number', () => {
    expect(schema.safeParse('abc').success).toBe(false)
  })
})

describe('selectedOptionSchema', () => {
  it('accepts an option, null and nothing', () => {
    expect(selectedOptionSchema.safeParse({ id: '1', label: 'One' }).success).toBe(true)
    expect(selectedOptionSchema.safeParse(null).success).toBe(true)
    expect(selectedOptionSchema.safeParse(undefined).success).toBe(true)
  })
})

describe('blankToNull', () => {
  it.each([
    [undefined, null],
    [null, null],
    ['', null],
    ['   ', null],
    ['text', 'text'],
  ])('turns %j into %j', (input, expected) => {
    expect(blankToNull(input)).toBe(expected)
  })
})

describe('optionId', () => {
  it('returns the id of the option or null', () => {
    expect(optionId({ id: '1', label: 'One' })).toBe('1')
    expect(optionId(null)).toBeNull()
    expect(optionId(undefined)).toBeNull()
  })
})
