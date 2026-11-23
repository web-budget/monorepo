import { defineStore } from 'pinia'
import { ref } from 'vue'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { periodResultsApi } from '@/api/periodResults'
import { useCrudResource } from '@/composables/useCrudResource'
import { createPageRequest } from '@/utils/pageRequest'
import type {
  FinancialPeriodCreateForm,
  FinancialPeriodListView,
  FinancialPeriodResultView,
  FinancialPeriodStatusFilter,
  PeriodResultView,
  RecurringLaunchReport,
} from '@/types'

const RESULTS_PAGE_SIZE = 100

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
  const results = ref<Record<string, PeriodResultView>>({})
  const lastClosedId = ref<string | null>(null)

  async function loadClosedInformation(periods: FinancialPeriodListView[]) {
    const closed = periods.filter((period) => period.status === 'CLOSED')
    if (closed.length === 0) {
      results.value = {}
      lastClosedId.value = null
      return
    }
    const endings = closed.map((period) => period.endingAt).sort()
    const [resultPage, lastClosedPage] = await Promise.all([
      periodResultsApi.findAll({
        from: endings[0],
        to: endings[endings.length - 1],
        size: RESULTS_PAGE_SIZE,
      }),
      financialPeriodsApi.findAll({ status: 'CLOSED', size: 1, sort: 'endingAt,desc' }),
    ])
    results.value = Object.fromEntries(
      resultPage.content.map((result) => [result.financialPeriod.id, result]),
    )
    lastClosedId.value = lastClosedPage.content[0]?.id ?? null
  }

  async function findLastClosedId(): Promise<string | null> {
    const page = await financialPeriodsApi.findAll({
      status: 'CLOSED',
      size: 1,
      sort: 'endingAt,desc',
    })
    lastClosedId.value = page.content[0]?.id ?? null
    return lastClosedId.value
  }

  function close(id: string): Promise<FinancialPeriodResultView> {
    return resource.track(() => financialPeriodsApi.close(id))
  }

  function reopen(id: string): Promise<void> {
    return resource.track(() => financialPeriodsApi.reopen(id))
  }

  function reset() {
    recurringLaunch.value = emptyReport()
    results.value = {}
    lastClosedId.value = null
    resource.reset()
  }

  return {
    financialPeriod: resource.current,
    recurringLaunch,
    results,
    lastClosedId,
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
    loadClosedInformation,
    findLastClosedId,
    close,
    reopen,
    reset,
  }
})
