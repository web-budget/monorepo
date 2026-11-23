import { apiClient } from './client'
import type { CardPurchaseListView, CardPurchaseQuery, PagedResponse } from '@/types'

const PATH = '/financial/card-purchases'

export const cardPurchasesApi = {
  findAll(query: CardPurchaseQuery): Promise<PagedResponse<CardPurchaseListView>> {
    return apiClient
      .get<PagedResponse<CardPurchaseListView>>(PATH, { params: query })
      .then((response) => response.data)
  },
}
