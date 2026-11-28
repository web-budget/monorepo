import { ref } from 'vue'
import { findAllPages } from '@/api/allPages'
import { classificationsApi } from '@/api/classifications'
import { costCentersApi } from '@/api/costCenters'
import { financialPeriodsApi } from '@/api/financialPeriods'
import type { ClassificationListView, CostCenterListView, FinancialPeriodListView } from '@/types'

const OPTIONS_PAGE_SIZE = 100

export function useMovementFilterOptions() {
  const periods = ref<FinancialPeriodListView[]>([])
  const costCenters = ref<CostCenterListView[]>([])
  const classifications = ref<ClassificationListView[]>([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    try {
      const [periodPage, loadedCostCenters, loadedClassifications] = await Promise.all([
        financialPeriodsApi.findAll({ status: 'ALL', size: OPTIONS_PAGE_SIZE }),
        findAllPages((query) => costCentersApi.findAll(query), {
          status: 'ACTIVE',
          sort: 'fullName,asc',
        }),
        findAllPages((query) => classificationsApi.findAll(query), {
          status: 'ACTIVE',
          sort: 'name,asc',
        }),
      ])
      periods.value = periodPage.content
      costCenters.value = loadedCostCenters
      classifications.value = loadedClassifications
    } finally {
      loading.value = false
    }
  }

  return { periods, costCenters, classifications, loading, load }
}
