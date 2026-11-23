import { defineStore } from 'pinia'
import { ref } from 'vue'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { useCrudResource } from '@/composables/useCrudResource'
import { createPageRequest } from '@/utils/pageRequest'
import type {
  FinancialPeriodCreateForm,
  FinancialPeriodStatusFilter,
  RecurringLaunchReport,
} from '@/types'

function emptyReport(): RecurringLaunchReport {
  return { launched: [], skipped: [] }
}

export const useFinancialPeriodsStore = defineStore('financialPeriods', () => {
  const recurringLaunch = ref<RecurringLaunchReport>(emptyReport())

  const resource = useCrudResource(
    {
      ...financialPeriodsApi,
      create: async (form: FinancialPeriodCreateForm) => {
        const creation = await financialPeriodsApi.create(form)
        recurringLaunch.value = creation.recurringLaunch
        return creation.id
      },
    },
    () => createPageRequest<FinancialPeriodStatusFilter>({ status: 'OPEN' }),
  )

  function reset() {
    recurringLaunch.value = emptyReport()
    resource.reset()
  }

  return {
    financialPeriod: resource.current,
    recurringLaunch,
    pageRequest: resource.pageRequest,
    pageResponse: resource.pageResponse,
    loading: resource.loading,
    findAll: resource.findAll,
    count: resource.count,
    findOne: resource.findOne,
    create: resource.create,
    update: resource.update,
    remove: resource.remove,
    findResult: financialPeriodsApi.findResult,
    reset,
  }
})
