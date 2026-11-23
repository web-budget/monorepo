import { apiClient } from './client'
import type { AdjustmentForm, PagedResponse, StatementQuery, WalletEntryView } from '@/types'

const PATH = '/financial/wallets'

export const walletEntriesApi = {
  findStatement(walletId: string, query: StatementQuery): Promise<PagedResponse<WalletEntryView>> {
    const params = { ...query, origins: query.origins?.join(',') }
    return apiClient
      .get<PagedResponse<WalletEntryView>>(`${PATH}/${walletId}/statement`, { params })
      .then((response) => response.data)
  },

  adjust(walletId: string, form: AdjustmentForm): Promise<WalletEntryView> {
    return apiClient
      .post<WalletEntryView>(`${PATH}/${walletId}/adjustments`, form)
      .then((response) => response.data)
  },
}
