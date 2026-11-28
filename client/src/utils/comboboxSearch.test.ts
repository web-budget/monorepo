import { describe, expect, it } from 'vitest'
import {
  filterOptions,
  findMatch,
  normalizeSearchText,
  splitLabel,
  type ComboboxOption,
} from '@/utils/comboboxSearch'

const options: ComboboxOption[] = [
  { label: 'Casa', value: 'house' },
  { label: 'Casa > Manutenção', value: 'house-maintenance' },
  { label: 'Saúde', value: 'health' },
  { label: 'Saúde > Farmácia', value: 'pharmacy' },
  { label: 'Saúde > Plano de saúde', value: 'plan' },
  { label: 'Água e esgoto', value: 'water' },
]

describe('normalizeSearchText', () => {
  it('drops accents, case and surrounding spaces', () => {
    expect(normalizeSearchText('  ÁGUA Saúde ')).toBe('agua saude')
  })
})

describe('findMatch', () => {
  it('finds the matched span of the original label', () => {
    expect(findMatch('Água e esgoto', 'agua')).toEqual({ start: 0, end: 4 })
    expect(findMatch('Plano de saúde', 'SAUDE')).toEqual({ start: 9, end: 14 })
  })

  it('maps offsets back when decomposed accents are in the label', () => {
    const decomposed = 'Sau\u0301de'
    expect(findMatch(decomposed, 'de')).toEqual({ start: 4, end: 6 })
    expect(findMatch(decomposed, 'sau')).toEqual({ start: 0, end: 4 })
  })

  it('has no match for an empty query or an absent term', () => {
    expect(findMatch('Casa', '   ')).toBeNull()
    expect(findMatch('Casa', 'pet')).toBeNull()
  })
})

describe('filterOptions', () => {
  it('keeps every option, with no range, for an empty query', () => {
    const result = filterOptions(options, '')

    expect(result).toHaveLength(options.length)
    expect(result.every(({ range }) => range === null)).toBe(true)
  })

  it('ignores accents and case and searches the whole label', () => {
    expect(filterOptions(options, 'saude').map(({ option }) => option.value)).toEqual([
      'health',
      'pharmacy',
      'plan',
    ])
    expect(filterOptions(options, 'AGUA').map(({ option }) => option.value)).toEqual(['water'])
    expect(filterOptions(options, 'manut').map(({ option }) => option.value)).toEqual([
      'house-maintenance',
    ])
  })

  it('returns nothing when no label matches', () => {
    expect(filterOptions(options, 'pet')).toEqual([])
  })
})

describe('splitLabel', () => {
  it('marks everything before the last separator as the parent', () => {
    expect(splitLabel('Casa > Mercado')).toEqual([
      { text: 'Casa > ', parent: true, matched: false },
      { text: 'Mercado', parent: false, matched: false },
    ])
  })

  it('treats a label without a separator as one plain part', () => {
    expect(splitLabel('Educação')).toEqual([{ text: 'Educação', parent: false, matched: false }])
  })

  it('keeps every ancestor in the parent part', () => {
    expect(splitLabel('Transporte > Carro > Manutenção')[0]).toEqual({
      text: 'Transporte > Carro > ',
      parent: true,
      matched: false,
    })
  })

  it('marks the matched span, which may cross into the parent', () => {
    expect(splitLabel('Saúde > Farmácia', { start: 0, end: 3 })).toEqual([
      { text: 'Saú', parent: true, matched: true },
      { text: 'de > ', parent: true, matched: false },
      { text: 'Farmácia', parent: false, matched: false },
    ])
  })

  it('returns no parts for an empty label', () => {
    expect(splitLabel('')).toEqual([])
  })
})
