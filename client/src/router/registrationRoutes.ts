import type { RouteRecordRaw } from 'vue-router'
import RegistrationLayout from '@/components/layout/RegistrationLayout.vue'
import { crudRoutes } from '@/router/crudRoutes'

export const registrationRoutes: RouteRecordRaw[] = [
  {
    path: '/registration',
    component: RegistrationLayout,
    meta: { breadcrumb: 'menu.registration', role: 'REGISTRATION' },
    children: [
      {
        path: '',
        name: 'registration',
        component: () => import('@/views/registration/RegistrationHomeView.vue'),
      },
      crudRoutes({
        path: 'wallets',
        name: 'wallets',
        entity: 'wallet',
        list: () => import('@/views/registration/wallets/WalletListView.vue'),
        form: () => import('@/views/registration/wallets/WalletFormView.vue'),
        detail: () => import('@/views/registration/wallets/WalletDetailView.vue'),
        extra: [
          {
            path: ':id/compartments/:compartmentId/detail',
            name: 'wallets.compartments.detail',
            props: true,
            meta: { breadcrumb: 'compartment.form.detailing' },
            component: () => import('@/views/registration/wallets/CompartmentHistoryView.vue'),
          },
        ],
      }),
      crudRoutes({
        path: 'cards',
        name: 'cards',
        entity: 'card',
        list: () => import('@/views/registration/cards/CardListView.vue'),
        form: () => import('@/views/registration/cards/CardFormView.vue'),
        detail: () => import('@/views/registration/cards/CardDetailView.vue'),
      }),
      crudRoutes({
        path: 'cost-centers',
        name: 'cost-centers',
        entity: 'cost-center',
        list: () => import('@/views/registration/cost-centers/CostCenterListView.vue'),
        form: () => import('@/views/registration/cost-centers/CostCenterFormView.vue'),
        detail: () => import('@/views/registration/cost-centers/CostCenterDetailView.vue'),
      }),
      crudRoutes({
        path: 'classifications',
        name: 'classifications',
        entity: 'classification',
        list: () => import('@/views/registration/classifications/ClassificationListView.vue'),
        form: () => import('@/views/registration/classifications/ClassificationFormView.vue'),
        detail: () => import('@/views/registration/classifications/ClassificationDetailView.vue'),
      }),
    ],
  },
]
