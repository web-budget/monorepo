import { apiClient } from './client'
import type { OverviewView } from '@/types'

export const dashboardsApi = {
  findOverview(cut: number | 'all'): Promise<OverviewView> {
    return apiClient
      .get<OverviewView>('/dashboards/overview', { params: { year: cut } })
      .then((response) => response.data)
  },
}
