import { apiClient } from './client'
import type { FinancialFlowView } from '@/types'

export const dashboardsApi = {
  findFinancialFlow(year?: number): Promise<FinancialFlowView> {
    return apiClient
      .get<FinancialFlowView>('/dashboards/financial-flow', { params: { year } })
      .then((response) => response.data)
  },
}
