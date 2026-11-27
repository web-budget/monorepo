import { describe, expect, it } from 'vitest'
import type { PeriodBudgetFigures, PeriodBudgetLine } from '@/types'
import {
  budgetRows,
  budgetTabOf,
  daysOverdue,
  formatDate,
  hasSuggestions,
} from '@/utils/periodDashboard'

const EMPTY: PeriodBudgetFigures = { budget: null, used: 0, suggested: null }

function line(
  id: string,
  parent: string | null,
  expense: Partial<PeriodBudgetFigures> = {},
  income: Partial<PeriodBudgetFigures> = {},
): PeriodBudgetLine {
  return {
    costCenter: { id, name: id.toUpperCase(), parent },
    expense: { ...EMPTY, ...expense },
    income: { ...EMPTY, ...income },
  }
}

describe('budgetTabOf', () => {
  it('opens the income tab only for "income"', () => {
    expect(budgetTabOf('income')).toBe('income')
    expect(budgetTabOf('')).toBe('expense')
    expect(budgetTabOf('anything')).toBe('expense')
  })
})

describe('budgetRows', () => {
  const lines = [
    line('food', null, { budget: 800, used: 300 }),
    line('market', 'food', { used: 300 }),
    line('home', null, { used: 0 }),
    line('rent', 'home', {}, { used: 50 }),
    line('salary', null, {}, { budget: 1000, used: 700 }),
    line('idle', null),
  ]

  it('walks the tree depth first with the depth of each row', () => {
    const rows = budgetRows(lines, 'expense')

    expect(rows.map((row) => [row.id, row.depth, row.hasChildren])).toEqual([
      ['food', 0, true],
      ['market', 1, false],
    ])
    expect(rows[0]!.figures.budget).toBe(800)
  })

  it('keeps a row that only has a descendant with figures and drops the empty ones', () => {
    const rows = budgetRows(lines, 'income')

    expect(rows.map((row) => row.id)).toEqual(['home', 'rent', 'salary'])
    expect(rows[0]!.hasChildren).toBe(true)
  })

  it('keeps a row that only has a suggestion', () => {
    const rows = budgetRows([line('travel', null, { suggested: 120 })], 'expense')

    expect(rows.map((row) => row.id)).toEqual(['travel'])
  })
})

describe('hasSuggestions', () => {
  it('is true when any line has a suggestion of either type', () => {
    expect(hasSuggestions([line('a', null)])).toBe(false)
    expect(hasSuggestions([line('a', null, { suggested: 10 })])).toBe(true)
    expect(hasSuggestions([line('a', null, {}, { suggested: 10 })])).toBe(true)
  })
})

describe('daysOverdue', () => {
  it('counts the whole days and never goes below zero', () => {
    const today = new Date(2026, 10, 27, 15, 30)

    expect(daysOverdue('2026-11-24', today)).toBe(3)
    expect(daysOverdue('2026-11-27', today)).toBe(0)
    expect(daysOverdue('2026-12-01', today)).toBe(0)
  })
})

describe('formatDate', () => {
  it('writes an ISO date as dd/mm/yyyy', () => {
    expect(formatDate('2026-11-05')).toBe('05/11/2026')
  })
})
