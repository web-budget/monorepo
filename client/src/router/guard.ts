import type { NavigationGuard, RouteLocationMatched } from 'vue-router'
import { sections } from '@/components/layout/sections'
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
  if (!auth.isApproved) {
    return { name: 'pending-approval' }
  }
  if (to.name === 'start') {
    const firstSection = sections.find(({ role }) => auth.hasRole(role))
    return firstSection ? firstSection.path : { name: '403' }
  }
  const missingRole = to.matched
    .map(requiredRole)
    .some((role) => role !== undefined && !auth.hasRole(role))
  return missingRole ? { name: '403' } : true
}
