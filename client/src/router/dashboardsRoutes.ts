import type { RouteRecordRaw } from 'vue-router'
import DashboardsLayout from '@/components/layout/DashboardsLayout.vue'

interface DashboardDefinition {
  path: string
  name: string
  key: string
}

const dashboards: DashboardDefinition[] = [
  { path: '', name: 'dashboards', key: 'overview' },
  { path: 'mes-atual', name: 'dashboards.current-month', key: 'current-month' },
  { path: 'meses-anteriores', name: 'dashboards.previous-months', key: 'previous-months' },
  { path: 'por-carteira', name: 'dashboards.by-wallet', key: 'by-wallet' },
  { path: 'por-classificacao', name: 'dashboards.by-classification', key: 'by-classification' },
]

export const dashboardsRoutes: RouteRecordRaw[] = [
  {
    path: '/dashboards',
    component: DashboardsLayout,
    meta: { breadcrumb: 'menu.dashboards', role: 'DASHBOARDS' },
    children: dashboards.map(({ path, name, key }) => ({
      path,
      name,
      meta: { breadcrumb: `dashboards.${key}` },
      props: { title: `dashboards.${key}`, description: `dashboards.description.${key}` },
      component: () => import('@/views/dashboards/DashboardView.vue'),
    })),
  },
]
