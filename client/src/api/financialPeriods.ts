import { apiClient } from './client'
import type {
  FinancialPeriodListView,
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

  create(form: FinancialPeriodCreateForm): Promise<void> {
    return apiClient.post(PATH, form).then(() => undefined)
  },

  update(id: string, form: FinancialPeriodUpdateForm): Promise<FinancialPeriodView> {
    return apiClient.put<FinancialPeriodView>(`${PATH}/${id}`, form).then((r) => r.data)
  },

  remove(id: string): Promise<void> {
    return apiClient.delete(`${PATH}/${id}`).then(() => undefined)
  },
}
