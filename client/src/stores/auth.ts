import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi } from '@/api/auth'
import { ApiError } from '@/api/client'
import router from '@/router'
import { isPublicRoute } from '@/router/publicRoutes'
import { resetUserStores } from '@/stores/resetUserStores'
import type {
  GoogleLinkRequest,
  Language,
  LoginOutcome,
  LoginRequest,
  PasswordChangeRequest,
  RegisterRequest,
  Role,
  SessionResponse,
  TotpEnrollRequest,
  TotpEnrollResponse,
  TotpVerifyRequest,
} from '@/types'

export type SessionEndReason = 'inactivity' | 'expired'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<SessionResponse | null>(null)
  const loading = ref(false)
  const endingSession = ref(false)
  const restoringSession = ref(false)
  const sessionUnavailable = ref(false)
  const registeredEmail = ref<string | null>(null)
  const isAuthenticated = computed(() => session.value !== null)
  const isApproved = computed(() => session.value?.status === 'APPROVED')

  function hasRole(role: Role): boolean {
    return session.value?.roles.includes(role) ?? false
  }

  function openSession(newSession: SessionResponse): SessionResponse {
    resetUserStores()
    registeredEmail.value = null
    session.value = newSession
    return newSession
  }

  function openSessionOf(outcome: LoginOutcome): LoginOutcome {
    if (outcome.kind === 'authenticated') {
      openSession(outcome.session)
    }
    return outcome
  }

  async function login(request: LoginRequest): Promise<LoginOutcome> {
    loading.value = true
    try {
      return openSessionOf(await authApi.login(request))
    } finally {
      loading.value = false
    }
  }

  async function linkGoogle(request: GoogleLinkRequest): Promise<LoginOutcome> {
    loading.value = true
    try {
      return openSessionOf(await authApi.linkGoogle(request))
    } finally {
      loading.value = false
    }
  }

  async function register(request: RegisterRequest): Promise<void> {
    await authApi.register(request)
    registeredEmail.value = request.email
  }

  function enrollTotp(request: TotpEnrollRequest): Promise<TotpEnrollResponse> {
    return authApi.enrollTotp(request)
  }

  async function verifyTotp(request: TotpVerifyRequest): Promise<SessionResponse> {
    loading.value = true
    try {
      return openSession(await authApi.verifyTotp(request))
    } finally {
      loading.value = false
    }
  }

  async function changeLanguage(language: Language): Promise<void> {
    session.value = await authApi.changeLanguage(language)
  }

  async function changeDueDateNotices(enabled: boolean): Promise<void> {
    session.value = await authApi.updateDueDateNotices(enabled)
  }

  async function changeName(name: string): Promise<void> {
    session.value = await authApi.changeName(name)
  }

  function changePassword(request: PasswordChangeRequest): Promise<void> {
    return authApi.changePassword(request)
  }

  async function restoreSession(): Promise<boolean> {
    loading.value = true
    restoringSession.value = true
    sessionUnavailable.value = false
    try {
      session.value = await authApi.fetchSession()
    } catch (error) {
      if (error instanceof ApiError && error.isUnavailable) {
        sessionUnavailable.value = true
      } else {
        clearSession()
      }
    } finally {
      loading.value = false
      restoringSession.value = false
    }
    return isAuthenticated.value
  }

  function clearSession() {
    session.value = null
    registeredEmail.value = null
    resetUserStores()
  }

  async function endSession(reason?: SessionEndReason) {
    const current = router.currentRoute.value
    const query: Record<string, string> = {}
    if (reason) {
      query.reason = reason
      if (!isPublicRoute(current)) {
        query.redirect = current.fullPath
      }
    }
    endingSession.value = true
    try {
      await router.replace({ name: 'login', query })
    } finally {
      endingSession.value = false
      clearSession()
    }
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout()
    } finally {
      await endSession()
    }
  }

  async function expireSession(reason: SessionEndReason): Promise<void> {
    if (!isAuthenticated.value || endingSession.value) {
      return
    }
    authApi.logout({ silent: true }).catch(() => undefined)
    await endSession(reason)
  }

  return {
    session,
    registeredEmail,
    isAuthenticated,
    isApproved,
    loading,
    endingSession,
    restoringSession,
    sessionUnavailable,
    hasRole,
    login,
    linkGoogle,
    register,
    enrollTotp,
    verifyTotp,
    changeLanguage,
    changeDueDateNotices,
    changeName,
    changePassword,
    restoreSession,
    clearSession,
    logout,
    expireSession,
  }
})
