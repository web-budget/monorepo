import type { LocationQuery } from 'vue-router'
import { PAGE_SIZE_OPTIONS } from '@/components/listing/itemsTable'
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT_DIRECTION,
  DEFAULT_SORT_FIELD,
  type PageRequest,
  type SortDirection,
} from '@/utils/pageRequest'
import { queryValue } from '@/utils/queryValue'

export const LIST_QUERY_KEYS = ['filter', 'status', 'page', 'size', 'sort'] as const

export interface ListQuerySettings<S extends string> {
  initialStatus: S
  statuses: readonly S[]
  sortFields: readonly string[]
}

export type ListQueryState<S extends string> = Pick<
  PageRequest<S>,
  'filterText' | 'status' | 'current' | 'size' | 'sortField' | 'direction'
>

const PAGE_PATTERN = /^[1-9]\d{0,8}$/

function parseStatus<S extends string>(text: string, settings: ListQuerySettings<S>): S {
  return settings.statuses.find((status) => status === text) ?? settings.initialStatus
}

function parsePage(text: string): number {
  return PAGE_PATTERN.test(text) ? Number(text) - 1 : 0
}

function parseSize(text: string): number {
  const size = Number(text)
  return PAGE_SIZE_OPTIONS.includes(size) ? size : DEFAULT_PAGE_SIZE
}

const SORT_DIRECTIONS: readonly SortDirection[] = ['asc', 'desc']

function parseSort(
  text: string,
  sortFields: readonly string[],
): Pick<PageRequest, 'sortField' | 'direction'> {
  const [sortField = '', directionText, ...rest] = text.split(',')
  const direction = SORT_DIRECTIONS.find((candidate) => candidate === directionText)
  const knownField = sortField === DEFAULT_SORT_FIELD || sortFields.includes(sortField)
  if (!knownField || direction === undefined || rest.length > 0) {
    return { sortField: DEFAULT_SORT_FIELD, direction: DEFAULT_SORT_DIRECTION }
  }
  return { sortField, direction }
}

export function parseListQuery<S extends string>(
  query: LocationQuery,
  settings: ListQuerySettings<S>,
): ListQueryState<S> {
  return {
    filterText: queryValue(query.filter),
    status: parseStatus(queryValue(query.status), settings),
    current: parsePage(queryValue(query.page)),
    size: parseSize(queryValue(query.size)),
    ...parseSort(queryValue(query.sort), settings.sortFields),
  }
}

export function buildListQuery<S extends string>(
  baseQuery: LocationQuery,
  state: ListQueryState<S>,
  initialStatus: S,
): LocationQuery {
  const query: LocationQuery = { ...baseQuery }
  for (const key of LIST_QUERY_KEYS) {
    delete query[key]
  }
  if (state.filterText !== '') {
    query.filter = state.filterText
  }
  if (state.status !== initialStatus) {
    query.status = state.status
  }
  if (state.current > 0) {
    query.page = String(state.current + 1)
  }
  if (state.size !== DEFAULT_PAGE_SIZE) {
    query.size = String(state.size)
  }
  if (state.sortField !== DEFAULT_SORT_FIELD || state.direction !== DEFAULT_SORT_DIRECTION) {
    query.sort = `${state.sortField},${state.direction}`
  }
  return query
}

export function sameListQuery(first: LocationQuery, second: LocationQuery): boolean {
  return LIST_QUERY_KEYS.every((key) => queryValue(first[key]) === queryValue(second[key]))
}

export function sameListState<S extends string>(
  first: ListQueryState<S>,
  second: ListQueryState<S>,
): boolean {
  return (
    first.filterText === second.filterText &&
    first.status === second.status &&
    first.current === second.current &&
    first.size === second.size &&
    first.sortField === second.sortField &&
    first.direction === second.direction
  )
}
