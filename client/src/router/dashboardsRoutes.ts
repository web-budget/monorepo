import type { RouteRecordRaw } from 'vue-router'
import DashboardsLayout from '@/components/layout/DashboardsLayout.vue'

export const dashboardsRoutes: RouteRecordRaw[] = [
  {
    path: '/dashboards',
    component: DashboardsLayout,
    meta: { breadcrumb: 'menu.dashboards', role: 'DASHBOARDS' },
    children: [
      { path: '', name: 'dashboards', redirect: { name: 'dashboards.financial-flow' } },
      {
        path: 'financial-flow',
        name: 'dashboards.financial-flow',
        meta: { breadcrumb: 'financial-flow.menu' },
        component: () => import('@/views/dashboards/FinancialFlowView.vue'),
      },
    ],
  },
]
