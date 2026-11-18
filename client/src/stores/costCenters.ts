import { defineStore } from 'pinia'
import { ref } from 'vue'
import { costCentersApi } from '@/api/costCenters'
import { useCrudResource } from '@/composables/useCrudResource'
import { createPageRequest } from '@/utils/pageRequest'
import type { CostCenterListView, StatusFilter } from '@/types'

export const useCostCentersStore = defineStore('costCenters', () => {
  const resource = useCrudResource(costCentersApi, () =>
    createPageRequest<StatusFilter>({ sortField: 'fullName' }),
  )
  const costCenters = ref<CostCenterListView[]>([])

  function findByName(text: string): Promise<void> {
    return resource.track(async () => {
      const page = await costCentersApi.findAll({ filter: text, status: 'ACTIVE' })
      costCenters.value = page.content
    })
  }

  function reset() {
    resource.reset()
    costCenters.value = []
  }

  return {
    costCenter: resource.current,
    costCenters,
    pageRequest: resource.pageRequest,
    pageResponse: resource.pageResponse,
    loading: resource.loading,
    findAll: resource.findAll,
    count: resource.count,
    findByName,
    findOne: resource.findOne,
    create: resource.create,
    update: resource.update,
    remove: resource.remove,
    reset,
  }
})
