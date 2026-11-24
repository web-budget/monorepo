import { defineStore } from 'pinia'
import { ref } from 'vue'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { movementsApi } from '@/api/movements'
import { periodResultsApi } from '@/api/periodResults'
import { useCrudResource } from '@/composables/useCrudResource'
import { createPageRequest } from '@/utils/pageRequest'
import { nextPeriodDates } from '@/utils/periodDates'
import type {
  FinancialPeriodCreateForm,
  FinancialPeriodListView,
  FinancialPeriodResultView,
  FinancialPeriodCreationPreview,
  FinancialPeriodStatusFilter,
  MovementStatus,
  PeriodResultView,
  RecurringLaunchReport,
} from '@/types'

const EXPIRED_PAGE_SIZE = 100
const RESULTS_PAGE_SIZE = 100

function emptyReport(): RecurringLaunchReport {
  return { launched: [], skipped: [] }
}

function emptyPreview(): FinancialPeriodCreationPreview {
  return { recurringMovements: [], invoices: [] }
}

export const useFinancialPeriodsStore = defineStore('financialPeriods', () => {
  const recurringLaunch = ref<RecurringLaunchReport>(emptyReport())
  const creationPreview = ref<FinancialPeriodCreationPreview>(emptyPreview())
  const openedInvoices = ref(0)

  const resource = useCrudResource(
    {
      ...financialPeriodsApi,
      create: async (form: FinancialPeriodCreateForm) => {
        const invoices = creationPreview.value.invoices.length
        const creation = await financialPeriodsApi.create(form)
        recurringLaunch.value = creation.recurringLaunch
        openedInvoices.value = invoices
        void findCreationPreview()
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

  async function findCreationPreview() {
    try {
      creationPreview.value = await financialPeriodsApi.findCreationPreview()
    } catch {
      creationPreview.value = emptyPreview()
    }
  }

  function reset() {
    recurringLaunch.value = emptyReport()
    results.value = {}
    lastClosedId.value = null
    creationPreview.value = emptyPreview()
    openedInvoices.value = 0
    resource.reset()
  }

  async function findExpired() {
    const page = await financialPeriodsApi.findAll({ status: 'OPEN', size: EXPIRED_PAGE_SIZE })
    return page.content.filter((period) => period.expired)
  }

  async function findNextDates() {
    const page = await financialPeriodsApi.findAll({
      status: 'ALL',
      size: 1,
      sort: 'endingAt,desc',
    })
    return nextPeriodDates(page.content[0]?.endingAt ?? null, new Date())
  }

  async function findMovementCounts(financialPeriod: string) {
    const total = async (statuses?: MovementStatus[]) =>
      (await movementsApi.findAll({ financialPeriods: [financialPeriod], statuses, size: 1 })).page
        .totalElements
    const [launched, open, paid] = await Promise.all([total(), total(['OPEN']), total(['PAID'])])
    return { launched, open, paid }
  }

  return {
    financialPeriod: resource.current,
    recurringLaunch,
    results,
    lastClosedId,
    creationPreview,
    openedInvoices,
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
    findCreationPreview,
    findExpired,
    findNextDates,
    findMovementCounts,
    reset,
  }
})
