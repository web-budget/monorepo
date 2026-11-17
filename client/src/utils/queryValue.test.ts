import { describe, expect, it } from 'vitest'
import { queryValue } from '@/utils/queryValue'

describe('queryValue', () => {
  it('returns a single value', () => {
    expect(queryValue('abc')).toBe('abc')
  })

  it('returns the first value of a repeated parameter', () => {
    expect(queryValue(['first', 'second'])).toBe('first')
  })

  it.each([undefined, null, []])('falls back to an empty string for %s', (value) => {
    expect(queryValue(value as never)).toBe('')
  })
})
