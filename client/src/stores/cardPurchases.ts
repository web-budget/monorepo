import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { cardPurchasesApi } from '@/api/cardPurchases'
import type { CardPurchaseCreateForm, CardPurchaseUpdateForm, CardPurchaseView } from '@/types'

export const useCardPurchasesStore = defineStore('card-purchases', () => {
  const purchase = ref<CardPurchaseView | null>(null)
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

  function findOne(id: string): Promise<CardPurchaseView> {
    return track(async () => {
      purchase.value = await cardPurchasesApi.findById(id)
      return purchase.value
    })
  }

  function create(form: CardPurchaseCreateForm): Promise<string> {
    return track(() => cardPurchasesApi.create(form))
  }

  function update(id: string, form: CardPurchaseUpdateForm): Promise<CardPurchaseView> {
    return track(async () => {
      purchase.value = await cardPurchasesApi.update(id, form)
      return purchase.value
    })
  }

  function remove(id: string): Promise<void> {
    return track(async () => {
      await cardPurchasesApi.remove(id)
      purchase.value = null
    })
  }

  function reset() {
    purchase.value = null
  }

  return { purchase, loading, findOne, create, update, remove, reset }
})
