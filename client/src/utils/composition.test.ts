import { describe, expect, it } from 'vitest'
import type { CompositionView } from '@/types'
import {
  classificationLevel,
  compositionByOf,
  costCenterLevel,
  costCenterPath,
  heatColor,
  longMonth,
  rankRows,
  seasonRows,
  shortMonth,
  sortedRows,
  validNode,
} from '@/utils/composition'

const view: CompositionView = {
  cut: '2026',
  years: [2026],
  expenses: 1000,
  revenues: 500,
  costCenters: [
    { id: 'food', name: 'Alimentação', parent: null, value: 600 },
    { id: 'market', name: 'Mercado', parent: 'food', value: 400 },
    { id: 'eating-out', name: 'Restaurantes', parent: 'food', value: 150 },
    { id: 'home', name: 'Casa', parent: null, value: 400 },
  ],
  classifications: [
    { id: 'c-1', name: 'Hortifruti', costCenter: 'market', value: 150 },
    { id: 'c-2', name: 'Açougue', costCenter: 'market', value: 250 },
    { id: 'c-3', name: 'Aluguel', costCenter: 'home', value: 300 },
    { id: 'c-1', name: 'Hortifruti', costCenter: 'home', value: 100 },
  ],
  seasonality: [
    { id: 'c-1', name: 'Hortifruti', months: [10, null, 30, 20, ...Array(8).fill(null)] },
  ],
  incomeSources: [],
}

describe('compositionByOf', () => {
  it('groups by classification only for "classification"', () => {
    expect(compositionByOf('classification')).toBe('classification')
    expect(compositionByOf('')).toBe('costCenter')
    expect(compositionByOf('x')).toBe('costCenter')
  })
})

describe('validNode', () => {
  it('keeps a known cost center and drops an unknown one', () => {
    expect(validNode(view.costCenters, 'market')).toBe('market')
    expect(validNode(view.costCenters, 'nope')).toBeNull()
    expect(validNode(view.costCenters, '')).toBeNull()
  })
})

describe('costCenterPath', () => {
  it('goes from the root to the cost center', () => {
    expect(costCenterPath(view.costCenters, 'market').map((step) => step.id)).toEqual([
      'food',
      'market',
    ])
    expect(costCenterPath(view.costCenters, 'home').map((step) => step.id)).toEqual(['home'])
  })

  it('is empty at the top level', () => {
    expect(costCenterPath(view.costCenters, null)).toEqual([])
  })
})

describe('costCenterLevel', () => {
  it('lists the roots against the total of the expenses', () => {
    const level = costCenterLevel(view, null)

    expect(level.inputs.map((input) => [input.key, input.drill])).toEqual([
      ['food', 'food'],
      ['home', 'home'],
    ])
    expect(level.total).toBe(1000)
    expect(level.leaf).toBe(false)
  })

  it('lists the children of a cost center against its own total', () => {
    const level = costCenterLevel(view, 'food')

    expect(level.inputs.map((input) => input.key)).toEqual(['market', 'eating-out'])
    expect(level.total).toBe(600)
    expect(level.leaf).toBe(false)
  })

  it('lists the classifications posted in a cost center without children', () => {
    const level = costCenterLevel(view, 'home')

    expect(level.inputs.map((input) => [input.name, input.value, input.drill])).toEqual([
      ['Aluguel', 300, null],
      ['Hortifruti', 100, null],
    ])
    expect(level.total).toBe(400)
    expect(level.leaf).toBe(true)
  })
})

describe('classificationLevel', () => {
  it('sums each classification over the cost centers it was posted in', () => {
    const level = classificationLevel(view)

    expect(level.inputs.map((input) => [input.name, input.value])).toEqual([
      ['Hortifruti', 250],
      ['Açougue', 250],
      ['Aluguel', 300],
    ])
    expect(level.total).toBe(1000)
  })
})

describe('rankRows', () => {
  const rows = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      key: `r-${index}`,
      name: `Row ${index}`,
      value: 100 - index,
      drill: null,
    }))

  it('lists everything up to eleven rows, largest first, with the share of the total', () => {
    const ranked = rankRows(rows(11).reverse(), 1000, () => 'rest')

    expect(ranked).toHaveLength(11)
    expect(ranked[0]!.name).toBe('Row 0')
    expect(ranked[0]!.share).toBe(0.1)
    expect(ranked.every((row) => row.rest === null)).toBe(true)
  })

  it('folds what is past the tenth into one row with the names of the others', () => {
    const ranked = rankRows(rows(13), 2000, (count) => `Others ${count}`)

    expect(ranked).toHaveLength(11)
    const rest = ranked[10]!
    expect(rest.key).toBe('rest')
    expect(rest.name).toBe('Others 3')
    expect(rest.value).toBe(90 + 89 + 88)
    expect(rest.share).toBeCloseTo(267 / 2000)
    expect(rest.rest).toBe('Row 10, Row 11, Row 12')
    expect(rest.drill).toBeNull()
    expect(ranked.reduce((sum, row) => sum + row.value, 0)).toBe(
      rows(13).reduce((sum, row) => sum + row.value, 0),
    )
  })

  it('has no share without a total', () => {
    expect(rankRows(rows(1), 0, () => '')[0]!.share).toBe(0)
  })
})

describe('sortedRows', () => {
  it('sorts without folding and has no share without a total', () => {
    const inputs = [
      { key: 'a', name: 'A', value: 1, drill: null },
      { key: 'b', name: 'B', value: 3, drill: null },
    ]

    expect(sortedRows(inputs, 4).map((row) => [row.key, row.share, row.rest])).toEqual([
      ['b', 0.75, null],
      ['a', 0.25, null],
    ])
    expect(sortedRows(inputs, 0).map((row) => row.share)).toEqual([0, 0])
  })
})

describe('seasonRows', () => {
  it('totals the months with data and keeps the lowest and the highest', () => {
    expect(seasonRows(view)).toEqual([
      expect.objectContaining({ id: 'c-1', total: 60, low: 10, high: 30 }),
    ])
  })
})

describe('heatColor', () => {
  it('mixes more of the primary into the highest value of the row', () => {
    expect(heatColor(10, 10, 30)).toBe('color-mix(in oklch, var(--primary) 8%, var(--card))')
    expect(heatColor(30, 10, 30)).toBe('color-mix(in oklch, var(--primary) 95%, var(--card))')
  })

  it('uses a flat shade when the row barely varies', () => {
    expect(heatColor(100, 99, 100)).toBe('color-mix(in oklch, var(--primary) 34%, var(--card))')
  })
})

describe('month names', () => {
  it('writes the short month capitalized and the long month in full', () => {
    expect(shortMonth(0, 'pt-BR')).toBe('Jan')
    expect(shortMonth(11, 'pt-BR')).toBe('Dez')
    expect(longMonth(2, 'pt-BR')).toBe('março')
    expect(longMonth(0, 'en-US')).toBe('January')
  })
})
