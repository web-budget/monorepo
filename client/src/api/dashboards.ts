import { apiClient } from './client'
import type { OverviewView, PeriodDashboardView } from '@/types'

export const dashboardsApi = {
  findOverview(cut: number | 'all'): Promise<OverviewView> {
    return apiClient
      .get<OverviewView>('/dashboards/overview', { params: { year: cut } })
      .then((response) => response.data)
  },

  findPeriod(financialPeriod?: string): Promise<PeriodDashboardView> {
    return apiClient
      .get<PeriodDashboardView>('/dashboards/period', { params: { financialPeriod } })
      .then((response) => response.data)
  },
}
