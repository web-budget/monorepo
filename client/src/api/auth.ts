import type { AxiosResponse } from 'axios'
import { apiClient } from './client'
import type {
  AuthConfigResponse,
  GoogleLinkRequest,
  Language,
  LoginOutcome,
  LoginRequest,
  PasswordChangeRequest,
  RegisterRequest,
  SessionResponse,
  TotpEnrollRequest,
  TotpEnrollResponse,
  TotpVerifyRequest,
  TrustedDeviceView,
} from '@/types'

const ACCEPTED = 202

function toOutcome(response: AxiosResponse<SessionResponse | { status: string }>): LoginOutcome {
  if (response.status === ACCEPTED) {
    const step = (response.data as { status: string }).status
    return step === 'needs_enrollment' ? { kind: 'needs_enrollment' } : { kind: 'needs_totp' }
  }
  return { kind: 'authenticated', session: response.data as SessionResponse }
}

export const authApi = {
  login(request: LoginRequest): Promise<LoginOutcome> {
    return apiClient.post('/auth/login', request).then(toOutcome)
  },

  register(request: RegisterRequest): Promise<void> {
    return apiClient.post('/auth/register', request).then(() => undefined)
  },

  enrollTotp(request: TotpEnrollRequest): Promise<TotpEnrollResponse> {
    return apiClient.post<TotpEnrollResponse>('/auth/totp/enroll', request).then((r) => r.data)
  },

  verifyTotp(request: TotpVerifyRequest): Promise<SessionResponse> {
    return apiClient.post<SessionResponse>('/auth/totp/verify', request).then((r) => r.data)
  },

  linkGoogle(request: GoogleLinkRequest): Promise<LoginOutcome> {
    return apiClient.post('/auth/google/link', request).then(toOutcome)
  },

  fetchSession(): Promise<SessionResponse> {
    return apiClient.get<SessionResponse>('/auth/session', { silent: true }).then((r) => r.data)
  },

  changeLanguage(language: Language): Promise<SessionResponse> {
    return apiClient.patch<SessionResponse>('/auth/language', { language }).then((r) => r.data)
  },

  changeName(name: string): Promise<SessionResponse> {
    return apiClient.patch<SessionResponse>('/auth/profile', { name }).then((r) => r.data)
  },

  changePassword(request: PasswordChangeRequest): Promise<void> {
    return apiClient.patch('/auth/password', request).then(() => undefined)
  },

  fetchConfig(): Promise<AuthConfigResponse> {
    return apiClient.get<AuthConfigResponse>('/auth/config', { silent: true }).then((r) => r.data)
  },

  findTrustedDevices(): Promise<TrustedDeviceView[]> {
    return apiClient.get<TrustedDeviceView[]>('/auth/trusted-devices').then((r) => r.data)
  },

  revokeTrustedDevice(id: string): Promise<void> {
    return apiClient.delete(`/auth/trusted-devices/${id}`).then(() => undefined)
  },

  revokeAllTrustedDevices(): Promise<void> {
    return apiClient.delete('/auth/trusted-devices').then(() => undefined)
  },

  logout(options: { silent?: boolean } = {}): Promise<void> {
    return apiClient.post('/auth/logout', undefined, options).then(() => undefined)
  },
}
