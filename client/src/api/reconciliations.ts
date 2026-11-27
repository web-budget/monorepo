import { apiClient } from './client'
import type {
  PagedResponse,
  PageQuery,
  ReconciliationForm,
  ReconciliationPosition,
  ReconciliationResultView,
  ReconciliationView,
} from '@/types'

const PATH = '/financial/wallets'

export const reconciliationsApi = {
  findAll(walletId: string, query: PageQuery): Promise<PagedResponse<ReconciliationView>> {
    return apiClient
      .get<PagedResponse<ReconciliationView>>(
        `${PATH}/${encodeURIComponent(walletId)}/reconciliations`,
        { params: query },
      )
      .then((response) => response.data)
  },

  findPosition(walletId: string, reconciliationId: string): Promise<ReconciliationPosition> {
    return apiClient
      .get<ReconciliationPosition>(
        `${PATH}/${encodeURIComponent(walletId)}/reconciliations/${encodeURIComponent(reconciliationId)}/position`,
        { silent: true },
      )
      .then((response) => response.data)
  },

  reconcile(walletId: string, form: ReconciliationForm): Promise<ReconciliationResultView> {
    return apiClient
      .post<ReconciliationResultView>(
        `${PATH}/${encodeURIComponent(walletId)}/reconciliations`,
        form,
      )
      .then((response) => response.data)
  },
}
