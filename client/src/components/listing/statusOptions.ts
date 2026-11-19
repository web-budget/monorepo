import type { StatusFilter, UserStatusFilter } from '@/types'

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

export const USER_STATUS_OPTIONS: StatusOption<UserStatusFilter>[] = [
  { label: 'users.status-tabs.approved', value: 'APPROVED' },
  { label: 'users.status-tabs.pending', value: 'PENDING' },
  { label: 'users.status-tabs.blocked', value: 'BLOCKED' },
  { label: 'search-control.all', value: 'ALL' },
]
