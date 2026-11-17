import { apiClient } from './client'

export const rolesApi = {
  findAll(): Promise<string[]> {
    return apiClient.get<string[]>('/administration/roles').then((r) => r.data)
  },
}
