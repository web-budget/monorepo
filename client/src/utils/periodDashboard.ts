import type { PeriodBudgetFigures, PeriodBudgetLine } from '@/types'
import { parseLocalDate } from '@/utils/localDate'

export type BudgetTab = 'expense' | 'income'

export interface BudgetRow {
  id: string
  name: string
  depth: number
  hasChildren: boolean
  figures: PeriodBudgetFigures
}

const MILLISECONDS_IN_DAY = 86_400_000

export function budgetTabOf(value: string): BudgetTab {
  return value === 'income' ? 'income' : 'expense'
}

/**
 * The cost centers as the tree the screen shows, depth first. A row stays when it has a budget,
 * use or suggestion in the tab, or when a descendant does.
 */
export function budgetRows(lines: PeriodBudgetLine[], tab: BudgetTab): BudgetRow[] {
  const byParent = new Map<string | null, PeriodBudgetLine[]>()
  for (const line of lines) {
    const siblings = byParent.get(line.costCenter.parent) ?? []
    siblings.push(line)
    byParent.set(line.costCenter.parent, siblings)
  }

  const roots = lines.filter((line) => line.costCenter.parent === null)

  const visit = (line: PeriodBudgetLine, depth: number): BudgetRow[] => {
    const children = (byParent.get(line.costCenter.id) ?? []).flatMap((child) =>
      visit(child, depth + 1),
    )
    const figures = line[tab]
    const own = figures.budget !== null || figures.used > 0 || figures.suggested !== null
    if (!own && children.length === 0) {
      return []
    }
    return [
      {
        id: line.costCenter.id,
        name: line.costCenter.name,
        depth,
        hasChildren: children.length > 0,
        figures,
      },
      ...children,
    ]
  }

  return roots.flatMap((root) => visit(root, 0))
}

export function hasSuggestions(lines: PeriodBudgetLine[]): boolean {
  return lines.some((line) => line.expense.suggested !== null || line.income.suggested !== null)
}

/** Whole days between the due date and today, never negative. */
export function daysOverdue(dueDate: string, today: Date): number {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.max(
    0,
    Math.round((start.getTime() - parseLocalDate(dueDate).getTime()) / MILLISECONDS_IN_DAY),
  )
}

export function formatDate(isoDate: string): string {
  return isoDate.split('-').reverse().join('/')
}
