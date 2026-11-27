import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { dashboardsApi } from '@/api/dashboards'
import type { OverviewView } from '@/types'

export const useOverviewStore = defineStore('overview', () => {
  const overview = ref<OverviewView | null>(null)
  const pending = ref(0)
  const loading = computed(() => pending.value > 0)

  async function find(cut: number | 'all'): Promise<void> {
    pending.value++
    try {
      overview.value = await dashboardsApi.findOverview(cut)
    } finally {
      pending.value--
    }
  }

  function reset() {
    overview.value = null
  }

  return { overview, loading, find, reset }
})
