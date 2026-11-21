import type { RouteLocationMatched, RouteRecordRaw } from 'vue-router'

export const publicRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('@/components/layout/AuthLayout.vue'),
    meta: { public: true },
    children: [
      {
        path: '',
        name: 'login',
        component: () => import('@/views/auth/LoginView.vue'),
      },
    ],
  },
  {
    path: '/pending-approval',
    component: () => import('@/components/layout/AuthLayout.vue'),
    meta: { public: true },
    children: [
      {
        path: '',
        name: 'pending-approval',
        component: () => import('@/views/auth/PendingApprovalView.vue'),
      },
    ],
  },
  {
    path: '/auth',
    component: () => import('@/components/layout/AuthLayout.vue'),
    meta: { public: true },
    children: [
      {
        path: 'forgot-password',
        name: 'forgot-password',
        component: () => import('@/views/auth/ForgotPasswordView.vue'),
      },
      {
        path: 'recover-password',
        name: 'recover-password',
        component: () => import('@/views/auth/RecoverPasswordView.vue'),
      },
      {
        path: 'account-activation',
        name: 'account-activation',
        component: () => import('@/views/auth/AccountActivationView.vue'),
      },
    ],
  },
  {
    path: '/error/forbidden',
    name: '403',
    meta: { public: true },
    component: () => import('@/views/errors/ForbiddenView.vue'),
  },
  {
    path: '/error/not-found',
    name: '404',
    meta: { public: true },
    component: () => import('@/views/errors/NotFoundView.vue'),
  },
  {
    path: '/error/server-error',
    name: '500',
    meta: { public: true },
    component: () => import('@/views/errors/ServerErrorView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    meta: { public: true },
    component: () => import('@/views/errors/NotFoundView.vue'),
  },
]

export function isPublicRoute(route: { matched: RouteLocationMatched[] }): boolean {
  return route.matched.some((record) => record.meta.public === true)
}
