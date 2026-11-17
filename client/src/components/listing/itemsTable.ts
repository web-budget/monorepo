export interface ItemsTableColumn {
  field: string
  header: string
  sortable?: boolean
  class?: string
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

export const PAGE_SIZE_OPTIONS = [15, 30, 60]

export const DEFAULT_SORT_FIELD = 'createdOn'
