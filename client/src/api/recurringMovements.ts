import { apiClient } from './client'
import { createdId } from './createdId'
import type {
  PagedResponse,
  PageQuery,
  RecurringMovementCreateForm,
  RecurringMovementQuery,
  RecurringMovementUpdateForm,
  RecurringMovementView,
  RecurringValueForm,
  RecurringValueView,
} from '@/types'

const PATH = '/financial/recurring-movements'

export const recurringMovementsApi = {
  findAll(query: RecurringMovementQuery): Promise<PagedResponse<RecurringMovementView>> {
    const params = {
      ...query,
      valueKinds: query.valueKinds?.join(','),
      cards: query.cards?.join(','),
    }
    return apiClient
      .get<PagedResponse<RecurringMovementView>>(PATH, { params })
      .then((response) => response.data)
  },

  findById(id: string): Promise<RecurringMovementView> {
    return apiClient
      .get<RecurringMovementView>(`${PATH}/${encodeURIComponent(id)}`)
      .then((response) => response.data)
  },

  create(form: RecurringMovementCreateForm): Promise<string> {
    return apiClient.post(PATH, form).then(createdId)
  },

  update(id: string, form: RecurringMovementUpdateForm): Promise<RecurringMovementView> {
    return apiClient
      .put<RecurringMovementView>(`${PATH}/${encodeURIComponent(id)}`, form)
      .then((response) => response.data)
  },

  remove(id: string): Promise<void> {
    return apiClient.delete(`${PATH}/${encodeURIComponent(id)}`).then(() => undefined)
  },

  readjust(id: string, form: RecurringValueForm): Promise<RecurringMovementView> {
    return apiClient
      .patch<RecurringMovementView>(`${PATH}/${encodeURIComponent(id)}/value`, form)
      .then((response) => response.data)
  },

  findValues(id: string, query: PageQuery): Promise<PagedResponse<RecurringValueView>> {
    return apiClient
      .get<PagedResponse<RecurringValueView>>(`${PATH}/${encodeURIComponent(id)}/values`, {
        params: query,
      })
      .then((response) => response.data)
  },
}
