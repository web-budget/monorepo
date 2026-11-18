import { apiClient } from './client'
import { createdId } from './createdId'
import type {
  ClassificationListView,
  ClassificationView,
  ClassificationCreateForm,
  ClassificationUpdateForm,
  PagedResponse,
  PageQuery,
} from '@/types'

const PATH = '/registration/classifications'

export const classificationsApi = {
  findAll(query: PageQuery): Promise<PagedResponse<ClassificationListView>> {
    return apiClient
      .get<PagedResponse<ClassificationListView>>(PATH, { params: query })
      .then((r) => r.data)
  },

  findById(id: string): Promise<ClassificationView> {
    return apiClient.get<ClassificationView>(`${PATH}/${id}`).then((r) => r.data)
  },

  create(form: ClassificationCreateForm): Promise<string> {
    return apiClient.post(PATH, form).then(createdId)
  },

  update(id: string, form: ClassificationUpdateForm): Promise<ClassificationView> {
    return apiClient.put<ClassificationView>(`${PATH}/${id}`, form).then((r) => r.data)
  },

  remove(id: string): Promise<void> {
    return apiClient.delete(`${PATH}/${id}`).then(() => undefined)
  },
}
