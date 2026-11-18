import { apiClient } from './client'
import { createdId } from './createdId'
import type {
  CardListView,
  CardView,
  CardCreateForm,
  CardUpdateForm,
  PagedResponse,
  PageQuery,
} from '@/types'

const PATH = '/registration/cards'

export const cardsApi = {
  findAll(query: PageQuery): Promise<PagedResponse<CardListView>> {
    return apiClient.get<PagedResponse<CardListView>>(PATH, { params: query }).then((r) => r.data)
  },

  findById(id: string): Promise<CardView> {
    return apiClient.get<CardView>(`${PATH}/${id}`).then((r) => r.data)
  },

  create(form: CardCreateForm): Promise<string> {
    return apiClient.post(PATH, form).then(createdId)
  },

  update(id: string, form: CardUpdateForm): Promise<CardView> {
    return apiClient.put<CardView>(`${PATH}/${id}`, form).then((r) => r.data)
  },

  remove(id: string): Promise<void> {
    return apiClient.delete(`${PATH}/${id}`).then(() => undefined)
  },
}
