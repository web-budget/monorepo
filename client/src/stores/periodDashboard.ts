import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { dashboardsApi } from '@/api/dashboards'
import { financialPeriodsApi } from '@/api/financialPeriods'
import type { FinancialPeriodListView, PeriodDashboardView } from '@/types'

const PERIODS_PAGE_SIZE = 100

export const usePeriodDashboardStore = defineStore('periodDashboard', () => {
  const dashboard = ref<PeriodDashboardView | null>(null)
  const periods = ref<FinancialPeriodListView[]>([])
  const pending = ref(0)
  const loading = computed(() => pending.value > 0)

  async function findPeriods(): Promise<void> {
    pending.value++
    try {
      const page = await financialPeriodsApi.findAll({
        status: 'ALL',
        size: PERIODS_PAGE_SIZE,
        sort: 'endingAt,desc',
      })
      periods.value = page.content
    } finally {
      pending.value--
    }
  }

  async function find(financialPeriod?: string): Promise<void> {
    pending.value++
    try {
      dashboard.value = await dashboardsApi.findPeriod(financialPeriod)
    } finally {
      pending.value--
    }
  }

  function reset() {
    dashboard.value = null
    periods.value = []
  }

  return { dashboard, periods, loading, findPeriods, find, reset }
})
