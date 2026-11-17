import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi } from '@/api/auth'
import router from '@/router'
import { isPublicRoute } from '@/router/publicRoutes'
import { resetUserStores } from '@/stores/resetUserStores'
import type { LoginRequest, Role, SessionResponse } from '@/types'

export type SessionEndReason = 'inactivity' | 'expired'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<SessionResponse | null>(null)
  const loading = ref(false)
  const endingSession = ref(false)
  const isAuthenticated = computed(() => session.value !== null)

  function hasRole(role: Role): boolean {
    return session.value?.roles.includes(role) ?? false
  }

  async function login(credentials: LoginRequest): Promise<SessionResponse> {
    loading.value = true
    try {
      const newSession = await authApi.login(credentials)
      resetUserStores()
      session.value = newSession
      return newSession
    } finally {
      loading.value = false
    }
  }

  async function restoreSession(): Promise<boolean> {
    loading.value = true
    try {
      session.value = await authApi.fetchSession()
    } catch {
      clearSession()
    } finally {
      loading.value = false
    }
    return isAuthenticated.value
  }

  function clearSession() {
    session.value = null
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
    isAuthenticated,
    loading,
    endingSession,
    hasRole,
    login,
    restoreSession,
    clearSession,
    logout,
    expireSession,
  }
})
