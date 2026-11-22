import { apiClient } from './client'
import { createdId } from './createdId'
import type {
  FinancialPeriodListView,
  FinancialPeriodResultView,
  FinancialPeriodView,
  FinancialPeriodCreateForm,
  FinancialPeriodUpdateForm,
  PagedResponse,
  PageQuery,
} from '@/types'

const PATH = '/registration/financial-periods'

export const financialPeriodsApi = {
  findAll(query: PageQuery): Promise<PagedResponse<FinancialPeriodListView>> {
    return apiClient
      .get<PagedResponse<FinancialPeriodListView>>(PATH, { params: query })
      .then((r) => r.data)
  },

  findById(id: string): Promise<FinancialPeriodView> {
    return apiClient.get<FinancialPeriodView>(`${PATH}/${id}`).then((r) => r.data)
  },

  create(form: FinancialPeriodCreateForm): Promise<string> {
    return apiClient.post(PATH, form).then(createdId)
  },

  update(id: string, form: FinancialPeriodUpdateForm): Promise<FinancialPeriodView> {
    return apiClient.put<FinancialPeriodView>(`${PATH}/${id}`, form).then((r) => r.data)
  },

  remove(id: string): Promise<void> {
    return apiClient.delete(`${PATH}/${id}`).then(() => undefined)
  },

  findResult(id: string): Promise<FinancialPeriodResultView> {
    return apiClient
      .get<FinancialPeriodResultView>(`/financial/financial-periods/${id}/result`)
      .then((r) => r.data)
  },
}
