import type { RouteRecordRaw } from 'vue-router'
import DashboardsLayout from '@/components/layout/DashboardsLayout.vue'

export const dashboardsRoutes: RouteRecordRaw[] = [
  {
    path: '/dashboards',
    component: DashboardsLayout,
    meta: { breadcrumb: 'menu.dashboards', role: 'DASHBOARDS' },
    children: [
      { path: '', name: 'dashboards', redirect: { name: 'dashboards.overview' } },
      {
        path: 'overview',
        name: 'dashboards.overview',
        meta: { breadcrumb: 'overview.menu' },
        component: () => import('@/views/dashboards/OverviewView.vue'),
      },
      {
        path: 'financial-flow',
        redirect: (to) => ({ name: 'dashboards.overview', query: to.query }),
      },
    ],
  },
]
