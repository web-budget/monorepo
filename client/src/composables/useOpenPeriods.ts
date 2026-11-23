import { ref } from 'vue'
import { financialPeriodsApi } from '@/api/financialPeriods'
import type { FinancialPeriodListView } from '@/types'

const PERIODS_PAGE_SIZE = 100

export function useOpenPeriods() {
  const periods = ref<FinancialPeriodListView[]>([])

  async function load() {
    const page = await financialPeriodsApi.findAll({
      status: 'OPEN',
      size: PERIODS_PAGE_SIZE,
      sort: 'startingAt,desc',
    })
    periods.value = page.content
  }

  return { periods, load }
}
