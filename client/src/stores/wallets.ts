import { defineStore } from 'pinia'
import { ref } from 'vue'
import { walletsApi } from '@/api/wallets'
import { useCrudResource } from '@/composables/useCrudResource'
import { createPageRequest } from '@/utils/pageRequest'
import type { StatusFilter, WalletListView } from '@/types'

export const useWalletsStore = defineStore('wallets', () => {
  const resource = useCrudResource(walletsApi, () => createPageRequest<StatusFilter>())
  const wallets = ref<WalletListView[]>([])

  function findByName(text: string): Promise<void> {
    return resource.track(async () => {
      const page = await walletsApi.findAll({ filter: text, status: 'ACTIVE' })
      wallets.value = page.content
    })
  }

  function reset() {
    resource.reset()
    wallets.value = []
  }

  return {
    wallet: resource.current,
    wallets,
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
