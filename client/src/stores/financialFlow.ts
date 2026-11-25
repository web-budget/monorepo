import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { dashboardsApi } from '@/api/dashboards'
import type { FinancialFlowView } from '@/types'

export const useFinancialFlowStore = defineStore('financialFlow', () => {
  const flow = ref<FinancialFlowView | null>(null)
  const pending = ref(0)
  const loading = computed(() => pending.value > 0)

  async function find(year: number): Promise<void> {
    pending.value++
    try {
      flow.value = await dashboardsApi.findFinancialFlow(year)
    } finally {
      pending.value--
    }
  }

  function reset() {
    flow.value = null
  }

  return { flow, loading, find, reset }
})
