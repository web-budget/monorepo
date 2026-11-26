import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { importsApi } from '@/api/imports'
import type {
  ImportCounts,
  ImportQuery,
  ImportStatus,
  ImportStatusFilter,
  ImportView,
  PageQuery,
} from '@/types'
import { markHandled } from '@/utils/handledErrors'
import type { ExtraQuery } from '@/utils/listQuery'
import {
  createPageRequest,
  createPageResponse,
  toPageQuery,
  type PageRequest,
  type PageResponse,
} from '@/utils/pageRequest'
import type { ImportListView } from '@/types'

export const IMPORT_FILTER_KEYS = ['destination', 'period']

export const IMPORT_STATUSES: ImportStatusFilter[] = [
  'READY',
  'PROCESSING',
  'FAILED',
  'SAVED',
  'UNDONE',
  'ALL',
]

export function toImportQuery(query: PageQuery, filters: ExtraQuery): ImportQuery {
  const status = query.status as ImportStatusFilter | undefined
  const [kind, destinationId] = (filters.destination ?? '').split(':')
  return {
    filter: query.filter || undefined,
    statuses: status === undefined || status === 'ALL' ? undefined : [status as ImportStatus],
    card: kind === 'card' ? destinationId : undefined,
    wallet: kind === 'wallet' ? destinationId : undefined,
    financialPeriod: filters.period || undefined,
    page: query.page,
    size: query.size,
    sort: query.sort,
  }
}

function newPageRequest() {
  return createPageRequest<ImportStatusFilter>({ status: 'READY' })
}

export const useImportsStore = defineStore('imports', () => {
  const current = ref<ImportView | null>(null)
  const filters = ref<ExtraQuery>({})
  const pageRequest = ref<PageRequest<ImportStatusFilter>>(newPageRequest())
  const pageResponse = ref<PageResponse<ImportListView>>(createPageResponse())
  const counts = ref<ImportCounts | null>(null)
  const pending = ref(0)
  const loading = computed(() => pending.value > 0)

  async function track<T>(operation: () => Promise<T>): Promise<T> {
    pending.value++
    try {
      return await operation()
    } finally {
      pending.value--
    }
  }

  function findAll(): Promise<void> {
    return track(async () => {
      const { content, page } = await importsApi.findAll(
        toImportQuery(toPageQuery(pageRequest.value), filters.value),
      )
      pageResponse.value = { content, ...page }
    })
  }

  async function loadCounts(): Promise<void> {
    try {
      counts.value = await importsApi.counts(
        toImportQuery(toPageQuery(pageRequest.value), filters.value),
      )
    } catch (error) {
      markHandled(error)
      counts.value = null
    }
  }

  function findOne(id: string, silent = false): Promise<ImportView> {
    return track(async () => {
      current.value = await importsApi.findById(id, silent)
      return current.value
    })
  }

  function create(form: FormData): Promise<string> {
    return track(async () => (await importsApi.create(form)).id)
  }

  function remove(id: string): Promise<void> {
    return track(() => importsApi.remove(id))
  }

  function reset() {
    current.value = null
    filters.value = {}
    pageRequest.value = newPageRequest()
    pageResponse.value = createPageResponse()
    counts.value = null
  }

  return {
    current,
    filters,
    pageRequest,
    pageResponse,
    counts,
    loading,
    findAll,
    loadCounts,
    findOne,
    create,
    remove,
    reset,
  }
})
