import { apiClient } from './client'
import { createdId } from './createdId'
import type {
  CostCenterListView,
  CostCenterView,
  CostCenterCreateForm,
  CostCenterUpdateForm,
  PagedResponse,
  PageQuery,
} from '@/types'

const PATH = '/registration/cost-centers'

export const costCentersApi = {
  findAll(query: PageQuery): Promise<PagedResponse<CostCenterListView>> {
    return apiClient
      .get<PagedResponse<CostCenterListView>>(PATH, { params: query })
      .then((r) => r.data)
  },

  findById(id: string): Promise<CostCenterView> {
    return apiClient.get<CostCenterView>(`${PATH}/${id}`).then((r) => r.data)
  },

  create(form: CostCenterCreateForm): Promise<string> {
    return apiClient.post(PATH, form).then(createdId)
  },

  update(id: string, form: CostCenterUpdateForm): Promise<CostCenterView> {
    return apiClient.put<CostCenterView>(`${PATH}/${id}`, form).then((r) => r.data)
  },

  remove(id: string): Promise<void> {
    return apiClient.delete(`${PATH}/${id}`).then(() => undefined)
  },
}
