export interface ItemsTableColumn {
  field: string
  header: string
  sortable?: boolean
  class?: string
  align?: 'end'
  mono?: boolean
  wide?: boolean
}

export interface ItemsTableItem {
  id: string
  active?: boolean
}

export interface ItemsTableSortEvent {
  sortField: string
  sortOrder: 'asc' | 'desc'
}

export interface ItemsTablePageEvent {
  currentPage: number
  pageSize: number
}

export interface ItemsTableRowEvent<T extends ItemsTableItem = ItemsTableItem> {
  data: T
  index: number
}

export const MINIMUM_PAGE_SIZE = 15

export const PAGE_SIZE_OPTIONS = [MINIMUM_PAGE_SIZE, 30, 60]

export const DEFAULT_SORT_FIELD = 'createdOn'
