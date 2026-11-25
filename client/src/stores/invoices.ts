import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { cardPurchasesApi } from '@/api/cardPurchases'
import { invoicesApi } from '@/api/invoices'
import type {
  CardPurchaseListView,
  InvoiceQuery,
  InvoiceStatus,
  InvoiceStatusFilter,
  InvoiceView,
  PageQuery,
} from '@/types'
import type { ExtraQuery } from '@/utils/listQuery'
import {
  createPageRequest,
  createPageResponse,
  toPageQuery,
  type PageRequest,
  type PageResponse,
} from '@/utils/pageRequest'
import { markHandled } from '@/utils/handledErrors'

export const INVOICE_FILTER_KEYS = ['period', 'card']

export const ALL_PERIODS = 'all'

export function toInvoiceQuery(query: PageQuery, filters: ExtraQuery): InvoiceQuery {
  const status = query.status as InvoiceStatusFilter | undefined
  return {
    card: filters.card || undefined,
    financialPeriod: filters.period && filters.period !== ALL_PERIODS ? filters.period : undefined,
    statuses: status === undefined || status === 'ALL' ? undefined : [status as InvoiceStatus],
    page: query.page,
    size: query.size,
    sort: query.sort,
  }
}

function newPageRequest() {
  return createPageRequest<InvoiceStatusFilter>({ status: 'ALL' })
}

export const useInvoicesStore = defineStore('invoices', () => {
  const invoice = ref<InvoiceView | null>(null)
  const filters = ref<ExtraQuery>({})
  const pageRequest = ref<PageRequest<InvoiceStatusFilter>>(newPageRequest())
  const pageResponse = ref<PageResponse<InvoiceView>>(createPageResponse())
  const purchases = ref<PageResponse<CardPurchaseListView>>(createPageResponse())
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
      const { content, page } = await invoicesApi.findAll(
        toInvoiceQuery(toPageQuery(pageRequest.value), filters.value),
      )
      pageResponse.value = { content, ...page }
    })
  }

  async function count(status: InvoiceStatusFilter): Promise<number | null> {
    try {
      const query = toInvoiceQuery(
        toPageQuery({ ...pageRequest.value, status, current: 0, size: 1 }),
        filters.value,
      )
      return (await invoicesApi.findAll(query)).page.totalElements
    } catch (error) {
      markHandled(error)
      return null
    }
  }

  function findOne(id: string): Promise<InvoiceView> {
    return track(async () => {
      invoice.value = await invoicesApi.findById(id)
      return invoice.value
    })
  }

  function findPurchases(id: string): Promise<void> {
    return track(async () => {
      const { content, page } = await cardPurchasesApi.findAll({
        invoice: id,
        size: 50,
        sort: 'purchasedOn,desc',
      })
      purchases.value = { content, ...page }
    })
  }

  function close(id: string): Promise<InvoiceView> {
    return track(async () => {
      invoice.value = await invoicesApi.close(id)
      return invoice.value
    })
  }

  function reset() {
    invoice.value = null
    filters.value = {}
    pageRequest.value = newPageRequest()
    pageResponse.value = createPageResponse()
    purchases.value = createPageResponse()
  }

  return {
    invoice,
    filters,
    pageRequest,
    pageResponse,
    purchases,
    loading,
    findAll,
    count,
    findOne,
    findPurchases,
    close,
    reset,
  }
})
