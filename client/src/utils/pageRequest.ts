import type { PageQuery } from '@/types'

export type SortDirection = 'asc' | 'desc'

export interface PageRequest<S extends string = string> {
  filterText: string
  status: S
  current: number
  size: number
  direction: SortDirection
  sortField: string
}

export interface PageResponse<T> {
  content: T[]
  size: number
  number: number
  totalElements: number
  totalPages: number
}

export const DEFAULT_PAGE_SIZE = 15

export const DEFAULT_SORT_FIELD = 'createdOn'

export const DEFAULT_SORT_DIRECTION: SortDirection = 'desc'

export function createPageRequest<S extends string = 'ACTIVE'>(
  overrides: Partial<PageRequest<S>> = {},
): PageRequest<S> {
  return {
    filterText: '',
    status: 'ACTIVE' as S,
    current: 0,
    size: DEFAULT_PAGE_SIZE,
    direction: DEFAULT_SORT_DIRECTION,
    sortField: DEFAULT_SORT_FIELD,
    ...overrides,
  }
}

export function createPageResponse<T>(): PageResponse<T> {
  return { content: [], size: DEFAULT_PAGE_SIZE, number: 0, totalElements: 0, totalPages: 0 }
}

export function toPageQuery(request: PageRequest): PageQuery {
  return {
    filter: request.filterText,
    status: request.status.toUpperCase(),
    page: request.current,
    size: request.size,
    sort: `${request.sortField},${request.direction}`,
  }
}
