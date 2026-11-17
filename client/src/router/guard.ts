import type { NavigationGuard } from 'vue-router'
import { isPublicRoute } from '@/router/publicRoutes'
import { useAuthStore } from '@/stores/auth'

export const authGuard: NavigationGuard = async (to) => {
  if (isPublicRoute(to)) {
    return true
  }
  const auth = useAuthStore()
  if (auth.isAuthenticated || (await auth.restoreSession())) {
    return true
  }
  return { name: 'login', query: { redirect: to.fullPath } }
}
