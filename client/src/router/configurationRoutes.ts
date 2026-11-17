import type { RouteRecordRaw } from 'vue-router'
import ConfigurationLayout from '@/components/layout/ConfigurationLayout.vue'

export const configurationRoutes: RouteRecordRaw[] = [
  {
    path: '/configuration',
    component: ConfigurationLayout,
    meta: { breadcrumb: 'menu.configuration', role: 'ADMINISTRATION' },
    children: [
      {
        path: '',
        name: 'configuration',
        component: () => import('@/views/configuration/ConfigurationHomeView.vue'),
      },
    ],
  },
]
