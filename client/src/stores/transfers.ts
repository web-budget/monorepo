import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { transfersApi } from '@/api/transfers'
import type { TransferForm, TransferQuery, TransferView } from '@/types'
import type { ExtraQuery } from '@/utils/listQuery'
import {
  createPageRequest,
  createPageResponse,
  toPageQuery,
  type PageRequest,
  type PageResponse,
} from '@/utils/pageRequest'

export const TRANSFER_FILTER_KEYS = ['wallet', 'from', 'to']

export function toTransferQuery(request: PageRequest, filters: ExtraQuery): TransferQuery {
  const query = toPageQuery(request)
  return {
    filter: query.filter || undefined,
    wallet: filters.wallet || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    page: query.page,
    size: query.size,
    sort: query.sort,
  }
}

export const useTransfersStore = defineStore('transfers', () => {
  const transfer = ref<TransferView | null>(null)
  const filters = ref<ExtraQuery>({})
  const pageRequest = ref(createPageRequest<string>({ status: 'ALL' }))
  const pageResponse = ref<PageResponse<TransferView>>(createPageResponse())
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
      const { content, page } = await transfersApi.findAll(
        toTransferQuery(pageRequest.value, filters.value),
      )
      pageResponse.value = { content, ...page }
    })
  }

  function findOne(id: string): Promise<TransferView> {
    return track(async () => {
      transfer.value = await transfersApi.findById(id)
      return transfer.value
    })
  }

  function create(form: TransferForm): Promise<string> {
    return track(() => transfersApi.create(form))
  }

  function giveBack(id: string): Promise<string> {
    return track(() => transfersApi.giveBack(id))
  }

  function reset() {
    transfer.value = null
    filters.value = {}
    pageRequest.value = createPageRequest<string>({ status: 'ALL' })
    pageResponse.value = createPageResponse()
  }

  return {
    transfer,
    filters,
    pageRequest,
    pageResponse,
    loading,
    findAll,
    findOne,
    create,
    giveBack,
    reset,
  }
})
