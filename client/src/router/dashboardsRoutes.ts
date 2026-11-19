import type { RouteRecordRaw } from 'vue-router'
import DashboardsLayout from '@/components/layout/DashboardsLayout.vue'

export const dashboardsRoutes: RouteRecordRaw[] = [
  {
    path: '/dashboards',
    component: DashboardsLayout,
    meta: { breadcrumb: 'menu.dashboards', role: 'DASHBOARDS' },
    children: [
      {
        path: '',
        name: 'dashboards',
        component: () => import('@/views/dashboards/DashboardsHomeView.vue'),
      },
    ],
  },
]
