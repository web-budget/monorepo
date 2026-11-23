import { apiClient } from './client'
import type { AccumulatedView, PagedResponse, PeriodResultQuery, PeriodResultView } from '@/types'

const PATH = '/financial/period-results'

export const periodResultsApi = {
  findAll(query: PeriodResultQuery): Promise<PagedResponse<PeriodResultView>> {
    return apiClient
      .get<PagedResponse<PeriodResultView>>(PATH, { params: query })
      .then((response) => response.data)
  },

  findAccumulated(): Promise<AccumulatedView> {
    return apiClient.get<AccumulatedView>(`${PATH}/accumulated`).then((response) => response.data)
  },
}
