import type { CompositionCostCenter, CompositionView } from '@/types'
import { monthLabel } from '@/utils/overview'

export type CompositionBy = 'costCenter' | 'classification'

export interface RankInput {
  key: string
  name: string
  value: number
  drill: string | null
}

export interface RankRow extends RankInput {
  share: number
  rest: string | null
}

export interface Level {
  inputs: RankInput[]
  total: number
  leaf: boolean
}

export interface SeasonRow {
  id: string
  name: string
  months: (number | null)[]
  total: number
  low: number
  high: number
}

export const TOP = 10

const HEAT_FLOOR = 8
const HEAT_RANGE = 87
const FLAT_SHADE = 0.3
const FLAT_THRESHOLD = 0.05

export function compositionByOf(value: string): CompositionBy {
  return value === 'classification' ? 'classification' : 'costCenter'
}

export function validNode(costCenters: CompositionCostCenter[], node: string): string | null {
  return costCenters.some((costCenter) => costCenter.id === node) ? node : null
}

export function costCenterPath(
  costCenters: CompositionCostCenter[],
  node: string | null,
): CompositionCostCenter[] {
  const byId = new Map(costCenters.map((costCenter) => [costCenter.id, costCenter]))
  const path: CompositionCostCenter[] = []
  let current = node === null ? undefined : byId.get(node)
  while (current !== undefined) {
    path.unshift(current)
    current = current.parent === null ? undefined : byId.get(current.parent)
  }
  return path
}

function costCenterInput(costCenter: CompositionCostCenter): RankInput {
  return {
    key: costCenter.id,
    name: costCenter.name,
    value: costCenter.value,
    drill: costCenter.id,
  }
}

/** What a level of the cost center drill-down lists: the roots, the children or the classifications. */
export function costCenterLevel(view: CompositionView, node: string | null): Level {
  if (node === null) {
    return {
      inputs: view.costCenters
        .filter((costCenter) => costCenter.parent === null)
        .map(costCenterInput),
      total: view.expenses,
      leaf: false,
    }
  }
  const current = view.costCenters.find((costCenter) => costCenter.id === node)!
  const children = view.costCenters.filter((costCenter) => costCenter.parent === node)
  if (children.length > 0) {
    return { inputs: children.map(costCenterInput), total: current.value, leaf: false }
  }
  return {
    inputs: view.classifications
      .filter((classification) => classification.costCenter === node)
      .map((classification) => ({
        key: classification.id,
        name: classification.name,
        value: classification.value,
        drill: null,
      })),
    total: current.value,
    leaf: true,
  }
}

/** The expense classifications, each one summed over the cost centers it was posted in. */
export function classificationLevel(view: CompositionView): Level {
  const totals = new Map<string, RankInput>()
  for (const classification of view.classifications) {
    const known = totals.get(classification.id)
    totals.set(classification.id, {
      key: classification.id,
      name: classification.name,
      value: (known?.value ?? 0) + classification.value,
      drill: null,
    })
  }
  return { inputs: [...totals.values()], total: view.expenses, leaf: true }
}

/** The ten largest rows and, past eleven, one row that folds the others, with their names in `rest`. */
export function rankRows(
  inputs: RankInput[],
  total: number,
  restName: (count: number) => string,
): RankRow[] {
  const sorted = [...inputs].sort((first, second) => second.value - first.value)
  const share = (value: number) => (total > 0 ? value / total : 0)
  const shown = sorted.length <= TOP + 1 ? sorted : sorted.slice(0, TOP)
  const rows: RankRow[] = shown.map((input) => ({
    ...input,
    share: share(input.value),
    rest: null,
  }))
  if (sorted.length > TOP + 1) {
    const others = sorted.slice(TOP)
    const value = others.reduce((sum, input) => sum + input.value, 0)
    rows.push({
      key: 'rest',
      name: restName(others.length),
      value,
      drill: null,
      share: share(value),
      rest: others.map((input) => input.name).join(', '),
    })
  }
  return rows
}

export function seasonRows(view: CompositionView): SeasonRow[] {
  return view.seasonality.map((classification) => {
    const known = classification.months.filter((value): value is number => value !== null)
    return {
      id: classification.id,
      name: classification.name,
      months: classification.months,
      total: known.reduce((sum, value) => sum + value, 0),
      low: Math.min(...known),
      high: Math.max(...known),
    }
  })
}

/** One tone, the primary mixed into the card, relative to the row's own lowest and highest month. */
export function heatColor(value: number, low: number, high: number): string {
  const shade = high - low > high * FLAT_THRESHOLD ? (value - low) / (high - low) : FLAT_SHADE
  return `color-mix(in oklch, var(--primary) ${Math.round(HEAT_FLOOR + HEAT_RANGE * shade)}%, var(--card))`
}

export function shortMonth(index: number, locale: string): string {
  const label = monthLabel(`2026-${String(index + 1).padStart(2, '0')}-01`, locale)
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`
}

export function longMonth(index: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2026, index, 1))
}

/** Every row, largest first, with its share of the total and nothing folded. */
export function sortedRows(inputs: RankInput[], total: number): RankRow[] {
  return [...inputs]
    .sort((first, second) => second.value - first.value)
    .map((input) => ({ ...input, share: total > 0 ? input.value / total : 0, rest: null }))
}
