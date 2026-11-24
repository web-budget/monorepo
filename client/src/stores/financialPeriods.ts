import { defineStore } from 'pinia'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { movementsApi } from '@/api/movements'
import { useCrudResource } from '@/composables/useCrudResource'
import { createPageRequest } from '@/utils/pageRequest'
import type { FinancialPeriodStatusFilter, MovementStatus } from '@/types'

const EXPIRED_PAGE_SIZE = 100

export const useFinancialPeriodsStore = defineStore('financialPeriods', () => {
  const resource = useCrudResource(financialPeriodsApi, () =>
    createPageRequest<FinancialPeriodStatusFilter>({ status: 'OPEN' }),
  )

  async function findExpired() {
    const page = await financialPeriodsApi.findAll({ status: 'OPEN', size: EXPIRED_PAGE_SIZE })
    return page.content.filter((period) => period.expired)
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
    findExpired,
    findMovementCounts,
    reset: resource.reset,
  }
})
