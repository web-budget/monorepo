import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { dashboardsApi } from '@/api/dashboards'
import type { CompositionView } from '@/types'

export const useCompositionStore = defineStore('composition', () => {
  const composition = ref<CompositionView | null>(null)
  const pending = ref(0)
  const loading = computed(() => pending.value > 0)

  async function find(cut: number | 'all'): Promise<void> {
    pending.value++
    try {
      composition.value = await dashboardsApi.findComposition(cut)
    } finally {
      pending.value--
    }
  }

  function reset() {
    composition.value = null
  }

  return { composition, loading, find, reset }
})
