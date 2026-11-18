import { apiClient } from './client'
import { createdId } from './createdId'
import type {
  WalletListView,
  WalletView,
  WalletCreateForm,
  WalletUpdateForm,
  PagedResponse,
  PageQuery,
} from '@/types'

const PATH = '/registration/wallets'

export const walletsApi = {
  findAll(query: PageQuery): Promise<PagedResponse<WalletListView>> {
    return apiClient.get<PagedResponse<WalletListView>>(PATH, { params: query }).then((r) => r.data)
  },

  findById(id: string): Promise<WalletView> {
    return apiClient.get<WalletView>(`${PATH}/${id}`).then((r) => r.data)
  },

  create(form: WalletCreateForm): Promise<string> {
    return apiClient.post(PATH, form).then(createdId)
  },

  update(id: string, form: WalletUpdateForm): Promise<WalletView> {
    return apiClient.put<WalletView>(`${PATH}/${id}`, form).then((r) => r.data)
  },

  remove(id: string): Promise<void> {
    return apiClient.delete(`${PATH}/${id}`).then(() => undefined)
  },
}
