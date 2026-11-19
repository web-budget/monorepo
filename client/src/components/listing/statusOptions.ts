import type { StatusFilter } from '@/types'

export interface StatusOption<S extends string = string> {
  label: string
  value: S
}

export const MASCULINE_STATUS_OPTIONS: StatusOption<StatusFilter>[] = [
  { label: 'search-control.active', value: 'ACTIVE' },
  { label: 'search-control.inactive', value: 'INACTIVE' },
  { label: 'search-control.all', value: 'ALL' },
]

export const FEMININE_STATUS_OPTIONS: StatusOption<StatusFilter>[] = [
  { label: 'search-control.feminine.active', value: 'ACTIVE' },
  { label: 'search-control.feminine.inactive', value: 'INACTIVE' },
  { label: 'search-control.feminine.all', value: 'ALL' },
]
