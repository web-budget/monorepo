import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { compartmentsApi } from '@/api/compartments'
import {
  createPageRequest,
  createPageResponse,
  toPageQuery,
  type PageResponse,
} from '@/utils/pageRequest'
import type {
  CompartmentCreateForm,
  CompartmentMovementForm,
  CompartmentMovementResult,
  CompartmentMovementView,
  CompartmentUpdateForm,
  CompartmentView,
} from '@/types'

export const useCompartmentsStore = defineStore('compartments', () => {
  const compartments = ref<CompartmentView[]>([])
  const compartment = ref<CompartmentView | null>(null)
  const pageRequest = ref(createPageRequest<'ALL'>({ status: 'ALL' }))
  const pageResponse = ref<PageResponse<CompartmentMovementView>>(createPageResponse())
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

  function findAll(walletId: string): Promise<void> {
    return track(async () => {
      compartments.value = await compartmentsApi.findAll(walletId)
    })
  }

  function findOne(walletId: string, compartmentId: string): Promise<void> {
    return track(async () => {
      compartment.value = await compartmentsApi.findById(walletId, compartmentId)
    })
  }

  function create(walletId: string, form: CompartmentCreateForm): Promise<string> {
    return track(() => compartmentsApi.create(walletId, form))
  }

  function update(
    walletId: string,
    compartmentId: string,
    form: CompartmentUpdateForm,
  ): Promise<CompartmentView> {
    return track(() => compartmentsApi.update(walletId, compartmentId, form))
  }

  function remove(walletId: string, compartmentId: string): Promise<void> {
    return track(() => compartmentsApi.remove(walletId, compartmentId))
  }

  function move(
    walletId: string,
    compartmentId: string,
    form: CompartmentMovementForm,
  ): Promise<CompartmentMovementResult> {
    return track(() => compartmentsApi.move(walletId, compartmentId, form))
  }

  function findMovements(walletId: string, compartmentId: string): Promise<void> {
    return track(async () => {
      const query = toPageQuery(pageRequest.value)
      const { content, page } = await compartmentsApi.findMovements(walletId, compartmentId, {
        page: query.page,
        size: query.size,
        sort: query.sort,
      })
      pageResponse.value = { content, ...page }
    })
  }

  function findPosition(
    walletId: string,
    compartmentId: string,
    movementId: string,
    sort?: string,
  ): Promise<number> {
    return track(async () => {
      const response = await compartmentsApi.findPosition(walletId, compartmentId, movementId, sort)
      return response.position
    })
  }

  function reset() {
    compartments.value = []
    compartment.value = null
    pageRequest.value = createPageRequest<'ALL'>({ status: 'ALL' })
    pageResponse.value = createPageResponse()
  }

  return {
    compartments,
    compartment,
    pageRequest,
    pageResponse,
    loading,
    findAll,
    findOne,
    create,
    update,
    remove,
    move,
    findMovements,
    findPosition,
    reset,
  }
})
