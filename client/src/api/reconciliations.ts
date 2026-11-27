import { apiClient } from './client'
import type { ReconciliationForm, ReconciliationResultView } from '@/types'

const PATH = '/financial/wallets'

export const reconciliationsApi = {
  reconcile(walletId: string, form: ReconciliationForm): Promise<ReconciliationResultView> {
    return apiClient
      .post<ReconciliationResultView>(
        `${PATH}/${encodeURIComponent(walletId)}/reconciliations`,
        form,
      )
      .then((response) => response.data)
  },
}
