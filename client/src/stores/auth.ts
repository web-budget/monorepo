import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi } from '@/api/auth'
import { resetUserStores } from '@/stores/resetUserStores'
import type { LoginRequest, SessionResponse } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<SessionResponse | null>(null)
  const loading = ref(false)
  const isAuthenticated = computed(() => session.value !== null)

  async function login(credentials: LoginRequest): Promise<SessionResponse> {
    loading.value = true
    try {
      session.value = await authApi.login(credentials)
      return session.value
    } finally {
      loading.value = false
    }
  }

  async function restoreSession(): Promise<boolean> {
    loading.value = true
    try {
      session.value = await authApi.fetchSession()
    } catch {
      session.value = null
    } finally {
      loading.value = false
    }
    return isAuthenticated.value
  }

  function clearSession() {
    session.value = null
    resetUserStores()
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout()
    } finally {
      clearSession()
    }
  }

  return { session, loading, isAuthenticated, login, restoreSession, clearSession, logout }
})
