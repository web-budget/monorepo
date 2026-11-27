import type { LocationQuery } from 'vue-router'
import { PAGE_SIZE_OPTIONS } from '@/components/listing/itemsTable'
import { DEFAULT_PAGE_SIZE } from '@/utils/pageRequest'
import { queryValue } from '@/utils/queryValue'

export const RECONCILIATION_ROW_PREFIX = 'reconciliation-'

export const HISTORY_QUERY_KEYS = ['reconciliation', 'reconciliationsPage', 'reconciliationsSize']

export interface HistoryQuery {
  reconciliation: string
  page: number | null
  size: number
}

const PAGE_PATTERN = /^[1-9]\d{0,8}$/

export function parseHistoryQuery(query: LocationQuery): HistoryQuery {
  const page = queryValue(query.reconciliationsPage)
  const size = Number(queryValue(query.reconciliationsSize))
  return {
    reconciliation: queryValue(query.reconciliation),
    page: PAGE_PATTERN.test(page) ? Number(page) - 1 : null,
    size: PAGE_SIZE_OPTIONS.includes(size) ? size : DEFAULT_PAGE_SIZE,
  }
}

export function buildHistoryQuery(
  baseQuery: LocationQuery,
  state: { reconciliation: string; current: number; size: number },
): LocationQuery {
  const query: LocationQuery = { ...baseQuery }
  for (const key of HISTORY_QUERY_KEYS) {
    delete query[key]
  }
  if (state.reconciliation !== '') {
    query.reconciliation = state.reconciliation
  }
  if (state.reconciliation !== '' || state.current > 0) {
    query.reconciliationsPage = String(state.current + 1)
  }
  if (state.size !== DEFAULT_PAGE_SIZE) {
    query.reconciliationsSize = String(state.size)
  }
  return query
}

export function historySignature(query: LocationQuery): string {
  return HISTORY_QUERY_KEYS.map((key) => queryValue(query[key])).join('|')
}
