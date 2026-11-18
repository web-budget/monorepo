import { defineStore } from 'pinia'
import { cardsApi } from '@/api/cards'
import { useCrudResource } from '@/composables/useCrudResource'
import { createPageRequest } from '@/utils/pageRequest'
import type { StatusFilter } from '@/types'

export const useCardsStore = defineStore('cards', () => {
  const resource = useCrudResource(cardsApi, () => createPageRequest<StatusFilter>())

  return {
    card: resource.current,
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
