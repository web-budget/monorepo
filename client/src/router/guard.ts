import type { NavigationGuard, RouteLocationMatched } from 'vue-router'
import { isPublicRoute } from '@/router/publicRoutes'
import { useAuthStore } from '@/stores/auth'
import type { Role } from '@/types'

function requiredRole(record: RouteLocationMatched): Role | undefined {
  return record.meta.role as Role | undefined
}

export const authGuard: NavigationGuard = async (to) => {
  if (isPublicRoute(to)) {
    return true
  }
  const auth = useAuthStore()
  if (!auth.isAuthenticated && !(await auth.restoreSession())) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  const missingRole = to.matched
    .map(requiredRole)
    .some((role) => role !== undefined && !auth.hasRole(role))
  return missingRole ? { name: '403' } : true
}
