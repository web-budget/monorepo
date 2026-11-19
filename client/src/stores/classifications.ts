import { defineStore } from 'pinia'
import { classificationsApi } from '@/api/classifications'
import { useCrudResource } from '@/composables/useCrudResource'
import { createPageRequest } from '@/utils/pageRequest'
import type { StatusFilter } from '@/types'

export const useClassificationsStore = defineStore('classifications', () => {
  const resource = useCrudResource(classificationsApi, () => createPageRequest<StatusFilter>())

  return {
    classification: resource.current,
    pageRequest: resource.pageRequest,
    pageResponse: resource.pageResponse,
    loading: resource.loading,
    findAll: resource.findAll,
    count: resource.count,
    findOne: resource.findOne,
    create: resource.create,
    update: resource.update,
    remove: resource.remove,
    reset: resource.reset,
  }
})
