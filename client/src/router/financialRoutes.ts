import type { RouteRecordRaw } from 'vue-router'
import FinancialLayout from '@/components/layout/FinancialLayout.vue'

export const financialRoutes: RouteRecordRaw[] = [
  {
    path: '/financial',
    component: FinancialLayout,
    meta: { breadcrumb: 'menu.financial', role: 'FINANCIAL' },
    children: [
      {
        path: '',
        name: 'financial',
        component: () => import('@/views/financial/FinancialHomeView.vue'),
      },
    ],
  },
]
