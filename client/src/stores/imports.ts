import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { importsApi } from '@/api/imports'
import type {
  ImportAction,
  ImportCandidateView,
  ImportCounts,
  ImportLineQuery,
  ImportLinesBatchForm,
  ImportLineStatusFilter,
  ImportLineUpdateForm,
  ImportLineView,
  ImportQuery,
  ImportResultFilter,
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

export const LINE_STATUSES: ImportLineStatusFilter[] = ['PENDING', 'IGNORED', 'ALL']

export function toImportLineQuery(query: PageQuery): ImportLineQuery {
  const status = query.status as ImportLineStatusFilter | undefined
  return {
    filter: query.filter || undefined,
    pending: status === 'PENDING' ? true : undefined,
    actions: status === 'IGNORED' ? (['IGNORE'] satisfies ImportAction[]) : undefined,
    page: query.page,
    size: query.size,
    sort: query.sort,
  }
}

export const RESULT_STATUSES: ImportResultFilter[] = [
  'CREATED',
  'LINKED',
  'RECURRING',
  'TRANSFERS',
  'IGNORED',
  'ALL',
]

const RESULT_ACTIONS: Record<Exclude<ImportResultFilter, 'ALL'>, ImportAction[]> = {
  CREATED: ['CREATE'],
  LINKED: ['LINK', 'INVOICE_PAYMENT'],
  RECURRING: ['LAUNCH_RECURRING', 'CREATE_RECURRING'],
  TRANSFERS: ['TRANSFER'],
  IGNORED: ['IGNORE'],
}

export function toImportResultQuery(query: PageQuery): ImportLineQuery {
  const status = query.status as ImportResultFilter
  return {
    page: query.page,
    size: query.size,
    sort: query.sort,
    actions: status === 'ALL' ? undefined : RESULT_ACTIONS[status],
  }
}

function newPageRequest() {
  return createPageRequest<ImportStatusFilter>({ status: 'READY' })
}

function newLineRequest() {
  return createPageRequest<ImportLineStatusFilter>({ status: 'PENDING', sortField: 'postedOn', direction: 'asc' })
}

function newResultRequest() {
  return createPageRequest<ImportResultFilter>({
    status: 'CREATED',
    sortField: 'postedOn',
    direction: 'asc',
  })
}

export const useImportsStore = defineStore('imports', () => {
  const current = ref<ImportView | null>(null)
  const filters = ref<ExtraQuery>({})
  const pageRequest = ref<PageRequest<ImportStatusFilter>>(newPageRequest())
  const pageResponse = ref<PageResponse<ImportListView>>(createPageResponse())
  const counts = ref<ImportCounts | null>(null)
  const lineRequest = ref<PageRequest<ImportLineStatusFilter>>(newLineRequest())
  const lineResponse = ref<PageResponse<ImportLineView>>(createPageResponse())
  const resultRequest = ref<PageRequest<ImportResultFilter>>(newResultRequest())
  const resultResponse = ref<PageResponse<ImportLineView>>(createPageResponse())
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

  function findLines(id: string): Promise<void> {
    return track(async () => {
      const { content, page } = await importsApi.findLines(
        id,
        toImportLineQuery(toPageQuery(lineRequest.value)),
      )
      lineResponse.value = { content, ...page }
    })
  }

  function findResults(id: string): Promise<void> {
    return track(async () => {
      const { content, page } = await importsApi.findLines(
        id,
        toImportResultQuery(toPageQuery(resultRequest.value)),
      )
      resultResponse.value = { content, ...page }
    })
  }

  function undo(id: string): Promise<ImportView> {
    return track(async () => {
      current.value = await importsApi.undo(id)
      return current.value
    })
  }

  function updateLine(id: string, lineId: string, form: ImportLineUpdateForm): Promise<ImportLineView> {
    return track(() => importsApi.updateLine(id, lineId, form))
  }

  function updateLines(id: string, form: ImportLinesBatchForm): Promise<void> {
    return track(() => importsApi.updateLines(id, form))
  }

  function candidates(id: string, lineId: string): Promise<ImportCandidateView[]> {
    return track(() => importsApi.candidates(id, lineId))
  }

  function save(id: string): Promise<ImportView> {
    return track(async () => {
      current.value = await importsApi.save(id)
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
    lineRequest.value = newLineRequest()
    lineResponse.value = createPageResponse()
    resultRequest.value = newResultRequest()
    resultResponse.value = createPageResponse()
  }

  return {
    current,
    filters,
    pageRequest,
    pageResponse,
    counts,
    lineRequest,
    lineResponse,
    resultRequest,
    resultResponse,
    loading,
    findAll,
    findLines,
    findResults,
    undo,
    updateLine,
    updateLines,
    candidates,
    save,
    loadCounts,
    findOne,
    create,
    remove,
    reset,
  }
})
