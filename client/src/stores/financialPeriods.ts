import { defineStore } from 'pinia'
import { ref } from 'vue'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { movementsApi } from '@/api/movements'
import { useCrudResource } from '@/composables/useCrudResource'
import { createPageRequest } from '@/utils/pageRequest'
import { nextPeriodDates } from '@/utils/periodDates'
import type {
  FinancialPeriodCreateForm,
  FinancialPeriodCreationPreview,
  FinancialPeriodStatusFilter,
  MovementStatus,
  RecurringLaunchReport,
} from '@/types'

const EXPIRED_PAGE_SIZE = 100

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

  async function findCreationPreview() {
    try {
      creationPreview.value = await financialPeriodsApi.findCreationPreview()
    } catch {
      creationPreview.value = emptyPreview()
    }
  }

  function reset() {
    recurringLaunch.value = emptyReport()
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
    findCreationPreview,
    findExpired,
    findNextDates,
    findMovementCounts,
    reset,
  }
})
