import { apiClient } from './client'
import { createdId } from './createdId'
import type {
  CardPurchaseCreateForm,
  CardPurchaseListView,
  CardPurchaseQuery,
  CardPurchaseUpdateForm,
  CardPurchaseView,
  PagedResponse,
} from '@/types'

const PATH = '/financial/card-purchases'

export const cardPurchasesApi = {
  findAll(query: CardPurchaseQuery): Promise<PagedResponse<CardPurchaseListView>> {
    return apiClient
      .get<PagedResponse<CardPurchaseListView>>(PATH, { params: query })
      .then((response) => response.data)
  },

  findById(id: string): Promise<CardPurchaseView> {
    return apiClient
      .get<CardPurchaseView>(`${PATH}/${encodeURIComponent(id)}`)
      .then((response) => response.data)
  },

  create(form: CardPurchaseCreateForm): Promise<string> {
    return apiClient.post(PATH, form).then(createdId)
  },

  update(id: string, form: CardPurchaseUpdateForm): Promise<CardPurchaseView> {
    return apiClient
      .put<CardPurchaseView>(`${PATH}/${encodeURIComponent(id)}`, form)
      .then((response) => response.data)
  },

  remove(id: string): Promise<void> {
    return apiClient.delete(`${PATH}/${encodeURIComponent(id)}`).then(() => undefined)
  },
}
