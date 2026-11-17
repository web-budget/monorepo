import { defineStore } from 'pinia'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { useCrudResource } from '@/composables/useCrudResource'
import { createPageRequest } from '@/utils/pageRequest'
import type { FinancialPeriodStatusFilter } from '@/types'

export const useFinancialPeriodsStore = defineStore('financialPeriods', () => {
  const resource = useCrudResource(financialPeriodsApi, () =>
    createPageRequest<FinancialPeriodStatusFilter>({
      status: 'OPEN',
      direction: 'desc',
      sortField: 'startingAt',
    }),
  )

  return {
    financialPeriod: resource.current,
    pageRequest: resource.pageRequest,
    pageResponse: resource.pageResponse,
    loading: resource.loading,
    findAll: resource.findAll,
    findOne: resource.findOne,
    create: resource.create,
    update: resource.update,
    remove: resource.remove,
    reset: resource.reset,
  }
})
