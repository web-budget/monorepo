import { apiClient } from './client'
import { createdId } from './createdId'
import type {
  MovementCreateForm,
  MovementListView,
  MovementQuery,
  MovementUpdateForm,
  MovementView,
  PagedResponse,
  PaymentForm,
} from '@/types'

const PATH = '/financial/movements'

export const movementsApi = {
  findAll(query: MovementQuery): Promise<PagedResponse<MovementListView>> {
    const params = {
      ...query,
      statuses: query.statuses?.join(','),
      financialPeriods: query.financialPeriods?.join(','),
    }
    return apiClient
      .get<PagedResponse<MovementListView>>(PATH, { params })
      .then((response) => response.data)
  },

  findById(id: string): Promise<MovementView> {
    return apiClient.get<MovementView>(`${PATH}/${id}`).then((response) => response.data)
  },

  create(form: MovementCreateForm): Promise<string> {
    return apiClient.post(PATH, form).then(createdId)
  },

  update(id: string, form: MovementUpdateForm): Promise<MovementView> {
    return apiClient.put<MovementView>(`${PATH}/${id}`, form).then((response) => response.data)
  },

  remove(id: string): Promise<void> {
    return apiClient.delete(`${PATH}/${id}`).then(() => undefined)
  },

  pay(id: string, form: PaymentForm): Promise<MovementView> {
    return apiClient
      .patch<MovementView>(`${PATH}/${id}/pay`, form)
      .then((response) => response.data)
  },

  undoPayment(id: string): Promise<MovementView> {
    return apiClient
      .patch<MovementView>(`${PATH}/${id}/undo-payment`)
      .then((response) => response.data)
  },
}
