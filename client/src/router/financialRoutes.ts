import type { RouteRecordRaw } from 'vue-router'
import FinancialLayout from '@/components/layout/FinancialLayout.vue'
import { crudRoutes } from '@/router/crudRoutes'

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
      crudRoutes({
        path: 'periods',
        name: 'financial-periods',
        entity: 'financial-period',
        list: () => import('@/views/financial/periods/FinancialPeriodListView.vue'),
        form: () => import('@/views/financial/periods/FinancialPeriodFormView.vue'),
        detail: () => import('@/views/financial/periods/FinancialPeriodDetailView.vue'),
      }),
      {
        path: 'statement',
        name: 'statement',
        meta: { breadcrumb: 'statement.menu' },
        component: () => import('@/views/financial/statement/StatementView.vue'),
      },
      crudRoutes({
        path: 'movements',
        name: 'movements',
        entity: 'movement',
        list: () => import('@/views/financial/movements/MovementListView.vue'),
        form: () => import('@/views/financial/movements/MovementFormView.vue'),
        detail: () => import('@/views/financial/movements/MovementDetailView.vue'),
      }),
    ],
  },
]
