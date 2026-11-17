import type { RouteLocationMatched, RouteRecordRaw } from 'vue-router'
import AuthLayout from '@/components/layout/AuthLayout.vue'

export const publicRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: AuthLayout,
    meta: { public: true },
    children: [
      {
        path: '',
        name: 'login',
        component: () => import('@/views/auth/LoginView.vue'),
      },
    ],
  },
]

export function isPublicRoute(route: { matched: RouteLocationMatched[] }): boolean {
  return route.matched.some((record) => record.meta.public === true)
}
