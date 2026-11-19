import { describe, expect, it } from 'vitest'
import { initials } from '@/utils/initials'

describe('initials', () => {
  it.each([
    ['Maria Conceição', 'MC'],
    ['maria da silva souza', 'MS'],
    ['  Ana   Souza ', 'AS'],
    ['Madonna', 'MA'],
    ['x', 'X'],
    ['', '?'],
    ['   ', '?'],
    [undefined, '?'],
  ])('turns %j into %j', (name, expected) => {
    expect(initials(name)).toBe(expected)
  })
})
