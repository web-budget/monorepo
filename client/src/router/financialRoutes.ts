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
      {
        path: 'transfers',
        meta: { breadcrumb: 'transfer.menu' },
        children: [
          {
            path: '',
            name: 'transfers',
            component: () => import('@/views/financial/transfers/TransferListView.vue'),
          },
          {
            path: 'create',
            name: 'transfers.create',
            meta: { breadcrumb: 'transfer.form.new' },
            component: () => import('@/views/financial/transfers/TransferFormView.vue'),
          },
          {
            path: ':id/detail',
            name: 'transfers.detail',
            props: true,
            meta: { breadcrumb: 'transfer.form.detailing' },
            component: () => import('@/views/financial/transfers/TransferDetailView.vue'),
          },
        ],
      },
      {
        path: 'invoices',
        meta: { breadcrumb: 'credit-card-invoice.menu' },
        children: [
          {
            path: '',
            name: 'invoices',
            component: () => import('@/views/financial/invoices/InvoiceListView.vue'),
          },
          {
            path: ':id/detail',
            name: 'invoices.detail',
            props: true,
            meta: { breadcrumb: 'credit-card-invoice.detail.breadcrumb' },
            component: () => import('@/views/financial/invoices/InvoiceDetailView.vue'),
          },
          { path: 'purchases', name: 'purchases', redirect: { name: 'invoices' } },
          {
            path: 'purchases/create',
            name: 'purchases.create',
            meta: { breadcrumb: 'card-purchase.form.new' },
            component: () => import('@/views/financial/invoices/CardPurchaseFormView.vue'),
          },
          {
            path: 'purchases/:id/update',
            name: 'purchases.update',
            props: true,
            meta: { breadcrumb: 'card-purchase.form.editing' },
            component: () => import('@/views/financial/invoices/CardPurchaseFormView.vue'),
          },
          {
            path: 'purchases/:id/detail',
            name: 'purchases.detail',
            props: true,
            meta: { breadcrumb: 'card-purchase.form.detailing' },
            component: () => import('@/views/financial/invoices/CardPurchaseDetailView.vue'),
          },
        ],
      },
      {
        path: 'closing',
        name: 'closing',
        meta: { breadcrumb: 'period-closing.breadcrumb' },
        component: () => import('@/views/financial/closing/PeriodClosingView.vue'),
      },
      crudRoutes({
        path: 'recurring-movements',
        name: 'recurring-movements',
        entity: 'recurrent-movement',
        list: () => import('@/views/financial/recurring/RecurringMovementListView.vue'),
        form: () => import('@/views/financial/recurring/RecurringMovementFormView.vue'),
        detail: () => import('@/views/financial/recurring/RecurringMovementDetailView.vue'),
        extra: [
          {
            path: 'launch',
            name: 'recurring-movements.launch',
            meta: { breadcrumb: 'recurrent-movement.launch.breadcrumb' },
            component: () => import('@/views/financial/recurring/RecurringLaunchView.vue'),
          },
        ],
      }),
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
