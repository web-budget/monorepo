import { defineStore } from 'pinia'
import { ref } from 'vue'
import { movementsApi } from '@/api/movements'
import { useCrudResource } from '@/composables/useCrudResource'
import type {
  MovementQuery,
  PaymentForm,
  MovementStatus,
  MovementStatusFilter,
  MovementType,
  PageQuery,
} from '@/types'
import { createPageRequest } from '@/utils/pageRequest'
import type { ExtraQuery } from '@/utils/listQuery'

export const MOVEMENT_FILTER_KEYS = [
  'period',
  'type',
  'costCenter',
  'classification',
  'overdue',
]

export const ALL_PERIODS = 'all'

export function toMovementQuery(query: PageQuery, filters: ExtraQuery): MovementQuery {
  const status = query.status as MovementStatusFilter
  return {
    filter: query.filter || undefined,
    statuses: status === 'ALL' || status === undefined ? undefined : [status as MovementStatus],
    type: (filters.type as MovementType | undefined) || undefined,
    costCenter: filters.costCenter || undefined,
    classification: filters.classification || undefined,
    overdue: filters.overdue === 'true' ? true : undefined,
    financialPeriods:
      filters.period && filters.period !== ALL_PERIODS ? [filters.period] : undefined,
    page: query.page,
    size: query.size,
    sort: query.sort,
  }
}

export const useMovementsStore = defineStore('movements', () => {
  const filters = ref<ExtraQuery>({})

  const resource = useCrudResource(
    {
      findAll: (query) => movementsApi.findAll(toMovementQuery(query, filters.value)),
      findById: movementsApi.findById,
      create: movementsApi.create,
      update: movementsApi.update,
      remove: movementsApi.remove,
    },
    () => createPageRequest<MovementStatusFilter>({ status: 'ALL' }),
  )

  function reset() {
    filters.value = {}
    resource.reset()
  }

  return {
    movement: resource.current,
    filters,
    pageRequest: resource.pageRequest,
    pageResponse: resource.pageResponse,
    loading: resource.loading,
    findAll: resource.findAll,
    count: (status: MovementStatusFilter) => resource.count(status, true),
    findOne: resource.findOne,
    create: resource.create,
    update: resource.update,
    remove: resource.remove,
    pay: (id: string, form: PaymentForm) =>
      resource.track(async () => {
        resource.current.value = await movementsApi.pay(id, form)
        return resource.current.value
      }),
    undoPayment: (id: string) =>
      resource.track(async () => {
        resource.current.value = await movementsApi.undoPayment(id)
        return resource.current.value
      }),
    reset,
  }
})
