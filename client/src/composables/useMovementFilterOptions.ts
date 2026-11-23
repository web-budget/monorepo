import { ref } from 'vue'
import { classificationsApi } from '@/api/classifications'
import { costCentersApi } from '@/api/costCenters'
import { financialPeriodsApi } from '@/api/financialPeriods'
import type {
  ClassificationListView,
  CostCenterListView,
  FinancialPeriodListView,
} from '@/types'

const OPTIONS_PAGE_SIZE = 100

export function useMovementFilterOptions() {
  const periods = ref<FinancialPeriodListView[]>([])
  const costCenters = ref<CostCenterListView[]>([])
  const classifications = ref<ClassificationListView[]>([])

  async function load() {
    const [periodPage, costCenterPage, classificationPage] = await Promise.all([
      financialPeriodsApi.findAll({ status: 'ALL', size: OPTIONS_PAGE_SIZE }),
      costCentersApi.findAll({ status: 'ACTIVE', size: OPTIONS_PAGE_SIZE, sort: 'name,asc' }),
      classificationsApi.findAll({ status: 'ACTIVE', size: OPTIONS_PAGE_SIZE, sort: 'name,asc' }),
    ])
    periods.value = periodPage.content
    costCenters.value = costCenterPage.content
    classifications.value = classificationPage.content
  }

  return { periods, costCenters, classifications, load }
}
