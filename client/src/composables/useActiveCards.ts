import { ref } from 'vue'
import { cardsApi } from '@/api/cards'
import type { CardListView } from '@/types'

const CARDS_PAGE_SIZE = 100

export function useActiveCards() {
  const cards = ref<CardListView[]>([])

  async function load() {
    const page = await cardsApi.findAll({
      status: 'ACTIVE',
      size: CARDS_PAGE_SIZE,
      sort: 'name,asc',
    })
    cards.value = page.content
  }

  return { cards, load }
}
