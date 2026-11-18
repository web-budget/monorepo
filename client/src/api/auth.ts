import { apiClient } from './client'
import type { LoginRequest, SessionResponse } from '@/types'

export const authApi = {
  login(credentials: LoginRequest): Promise<SessionResponse> {
    return apiClient.post<SessionResponse>('/auth/login', credentials).then((r) => r.data)
  },

  fetchSession(): Promise<SessionResponse> {
    return apiClient.get<SessionResponse>('/auth/session', { silent: true }).then((r) => r.data)
  },

  logout(options: { silent?: boolean } = {}): Promise<void> {
    return apiClient.post('/auth/logout', undefined, options).then(() => undefined)
  },
}
