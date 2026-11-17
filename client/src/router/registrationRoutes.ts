import type { RouteRecordRaw } from 'vue-router'
import RegistrationLayout from '@/components/layout/RegistrationLayout.vue'

export const registrationRoutes: RouteRecordRaw[] = [
  {
    path: '/registration',
    component: RegistrationLayout,
    meta: { breadcrumb: 'menu.registration' },
    children: [
      {
        path: '',
        name: 'registration',
        component: () => import('@/views/registration/RegistrationHomeView.vue'),
      },
    ],
  },
]
