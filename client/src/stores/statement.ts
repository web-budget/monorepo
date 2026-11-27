import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { walletEntriesApi } from '@/api/walletEntries'
import type {
  AdjustmentForm,
  StatementQuery,
  StatementSummary,
  WalletEntryDirectionFilter,
  WalletEntryOrigin,
} from '@/types'
import type { ExtraQuery } from '@/utils/listQuery'
import {
  createPageRequest,
  createPageResponse,
  toPageQuery,
  type PageRequest,
  type PageResponse,
} from '@/utils/pageRequest'
import type { WalletEntryView } from '@/types'

export const STATEMENT_FILTER_KEYS = ['wallet', 'period', 'origin', 'from', 'to', 'min', 'max']

export const WALLET_ENTRY_ORIGINS: WalletEntryOrigin[] = [
  'INCOME',
  'EXPENSE',
  'REVERSAL',
  'ADJUSTMENT',
  'TRANSFER',
  'INVOICE_PAYMENT',
  'COMPARTMENT',
]

function amountOf(text: string | undefined): number | undefined {
  const amount = Number(text)
  return text && Number.isFinite(amount) ? amount : undefined
}

export function toStatementFilter(request: PageRequest, filters: ExtraQuery): StatementQuery {
  const direction = request.status as WalletEntryDirectionFilter
  return {
    filter: request.filterText || undefined,
    direction: direction === 'ALL' ? undefined : direction,
    from: filters.from || undefined,
    to: filters.to || undefined,
    financialPeriod: filters.period || undefined,
    origins: filters.origin ? [filters.origin as WalletEntryOrigin] : undefined,
    minValue: amountOf(filters.min),
    maxValue: amountOf(filters.max),
  }
}

export function toStatementQuery(request: PageRequest, filters: ExtraQuery): StatementQuery {
  const { page, size, sort } = toPageQuery(request)
  return { ...toStatementFilter(request, filters), page, size, sort }
}

export const useStatementStore = defineStore('statement', () => {
  const filters = ref<ExtraQuery>({})
  const pageRequest = ref(createPageRequest<WalletEntryDirectionFilter>({ status: 'ALL' }))
  const pageResponse = ref<PageResponse<WalletEntryView>>(createPageResponse())
  const summary = ref<StatementSummary | null>(null)
  const pending = ref(0)
  const loading = computed(() => pending.value > 0)

  async function findAll(): Promise<void> {
    pending.value++
    try {
      const { content, page } = await walletEntriesApi.findStatement(
        filters.value.wallet ?? '',
        toStatementQuery(pageRequest.value, filters.value),
      )
      pageResponse.value = { content, ...page }
    } finally {
      pending.value--
    }
  }

  async function findSummary(): Promise<void> {
    pending.value++
    try {
      summary.value = await walletEntriesApi.findSummary(
        filters.value.wallet ?? '',
        toStatementFilter(pageRequest.value, filters.value),
      )
    } finally {
      pending.value--
    }
  }

  async function findEntry(walletId: string, entryId: string): Promise<WalletEntryView> {
    pending.value++
    try {
      return await walletEntriesApi.findEntry(walletId, entryId)
    } finally {
      pending.value--
    }
  }

  async function adjust(walletId: string, form: AdjustmentForm): Promise<WalletEntryView> {
    pending.value++
    try {
      return await walletEntriesApi.adjust(walletId, form)
    } finally {
      pending.value--
    }
  }

  function reset() {
    filters.value = {}
    pageRequest.value = createPageRequest<WalletEntryDirectionFilter>({ status: 'ALL' })
    pageResponse.value = createPageResponse()
    summary.value = null
  }

  return {
    filters,
    pageRequest,
    pageResponse,
    summary,
    loading,
    findAll,
    findSummary,
    findEntry,
    adjust,
    reset,
  }
})
