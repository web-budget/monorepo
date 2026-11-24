import type { RouteRecordRaw } from 'vue-router'
import ProfileLayout from '@/components/layout/ProfileLayout.vue'

export const profileRoutes: RouteRecordRaw[] = [
  {
    path: '/profile',
    component: ProfileLayout,
    meta: { breadcrumb: 'menu.home' },
    children: [
      {
        path: '',
        name: 'profile',
        meta: { breadcrumb: 'profile.breadcrumb' },
        component: () => import('@/views/profile/ProfileView.vue'),
      },
    ],
  },
]
