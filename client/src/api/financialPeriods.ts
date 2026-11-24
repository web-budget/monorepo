import { apiClient } from './client'
import { createdId } from './createdId'
import type {
  FinancialPeriodCreation,
  FinancialPeriodListView,
  FinancialPeriodResultView,
  FinancialPeriodView,
  FinancialPeriodCreateForm,
  FinancialPeriodUpdateForm,
  PagedResponse,
  PageQuery,
} from '@/types'

const PATH = '/financial/financial-periods'

export const financialPeriodsApi = {
  findAll(query: PageQuery): Promise<PagedResponse<FinancialPeriodListView>> {
    return apiClient
      .get<PagedResponse<FinancialPeriodListView>>(PATH, { params: query })
      .then((r) => r.data)
  },

  findById(id: string): Promise<FinancialPeriodView> {
    return apiClient.get<FinancialPeriodView>(`${PATH}/${id}`).then((r) => r.data)
  },

  create(form: FinancialPeriodCreateForm): Promise<FinancialPeriodCreation> {
    return apiClient
      .post<Pick<FinancialPeriodCreation, 'recurringLaunch'>>(PATH, form)
      .then((r) => ({
        id: createdId(r),
        recurringLaunch: r.data.recurringLaunch,
      }))
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
