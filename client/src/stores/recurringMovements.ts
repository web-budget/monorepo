import { defineStore } from 'pinia'
import { ref } from 'vue'
import { recurringMovementsApi } from '@/api/recurringMovements'
import { useCrudResource } from '@/composables/useCrudResource'
import type {
  MovementType,
  PageQuery,
  RecurringMovementQuery,
  RecurringMovementStatusFilter,
  RecurringValueForm,
  RecurringValueView,
} from '@/types'
import type { ExtraQuery } from '@/utils/listQuery'
import { createPageRequest, createPageResponse, type PageResponse } from '@/utils/pageRequest'

export const RECURRING_FILTER_KEYS = ['type']

export function toRecurringMovementQuery(
  query: PageQuery,
  filters: ExtraQuery,
): RecurringMovementQuery {
  const status = query.status as RecurringMovementStatusFilter | undefined
  return {
    filter: query.filter || undefined,
    type: (filters.type as MovementType | undefined) || undefined,
    active: status === 'ACTIVE' ? true : undefined,
    finished: status === 'FINISHED' ? true : status === 'ACTIVE' ? false : undefined,
    page: query.page,
    size: query.size,
    sort: query.sort,
  }
}

export const useRecurringMovementsStore = defineStore('recurringMovements', () => {
  const filters = ref<ExtraQuery>({})
  const values = ref<PageResponse<RecurringValueView>>(createPageResponse())

  const resource = useCrudResource(
    {
      findAll: (query) =>
        recurringMovementsApi.findAll(toRecurringMovementQuery(query, filters.value)),
      findById: recurringMovementsApi.findById,
      create: recurringMovementsApi.create,
      update: recurringMovementsApi.update,
      remove: recurringMovementsApi.remove,
    },
    () => createPageRequest<RecurringMovementStatusFilter>({ status: 'ACTIVE' }),
  )

  function findValues(id: string, page: number, size: number) {
    return resource.track(async () => {
      const response = await recurringMovementsApi.findValues(id, { page, size })
      values.value = { content: response.content, ...response.page }
    })
  }

  function readjust(id: string, form: RecurringValueForm) {
    return resource.track(async () => {
      resource.current.value = await recurringMovementsApi.readjust(id, form)
      return resource.current.value
    })
  }

  function reset() {
    filters.value = {}
    values.value = createPageResponse()
    resource.reset()
  }

  return {
    recurringMovement: resource.current,
    filters,
    values,
    pageRequest: resource.pageRequest,
    pageResponse: resource.pageResponse,
    loading: resource.loading,
    findAll: resource.findAll,
    count: resource.count,
    findOne: resource.findOne,
    create: resource.create,
    update: resource.update,
    remove: resource.remove,
    findValues,
    readjust,
    reset,
  }
})
