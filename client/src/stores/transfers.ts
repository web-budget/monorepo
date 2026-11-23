import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { transfersApi } from '@/api/transfers'
import type { TransferForm, TransferView } from '@/types'

export const useTransfersStore = defineStore('transfers', () => {
  const transfer = ref<TransferView | null>(null)
  const pending = ref(0)
  const loading = computed(() => pending.value > 0)

  async function track<T>(operation: () => Promise<T>): Promise<T> {
    pending.value++
    try {
      return await operation()
    } finally {
      pending.value--
    }
  }

  function findOne(id: string): Promise<TransferView> {
    return track(async () => {
      transfer.value = await transfersApi.findById(id)
      return transfer.value
    })
  }

  function create(form: TransferForm): Promise<string> {
    return track(() => transfersApi.create(form))
  }

  function giveBack(id: string): Promise<string> {
    return track(() => transfersApi.giveBack(id))
  }

  function reset() {
    transfer.value = null
  }

  return { transfer, loading, findOne, create, giveBack, reset }
})
