import { apiClient } from './client'
import { createdId } from './createdId'
import type { PagedResponse, TransferForm, TransferQuery, TransferView } from '@/types'

const PATH = '/financial/transfers'

export const transfersApi = {
  findAll(query: TransferQuery): Promise<PagedResponse<TransferView>> {
    return apiClient
      .get<PagedResponse<TransferView>>(PATH, { params: query })
      .then((response) => response.data)
  },

  create(form: TransferForm): Promise<string> {
    return apiClient.post(PATH, form).then(createdId)
  },

  findById(id: string): Promise<TransferView> {
    return apiClient
      .get<TransferView>(`${PATH}/${encodeURIComponent(id)}`)
      .then((response) => response.data)
  },

  giveBack(id: string): Promise<string> {
    return apiClient.post(`${PATH}/${encodeURIComponent(id)}/return`).then(createdId)
  },
}
