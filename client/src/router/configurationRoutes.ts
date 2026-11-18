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
      {
        path: 'users',
        meta: { breadcrumb: 'users.menu' },
        children: [
          {
            path: '',
            name: 'users',
            component: () => import('@/views/configuration/users/UserListView.vue'),
          },
          {
            path: 'create',
            name: 'users.create',
            meta: { breadcrumb: 'users.form.new', narrow: true },
            component: () => import('@/views/configuration/users/UserFormView.vue'),
          },
          {
            path: ':id/update',
            name: 'users.update',
            props: true,
            meta: { breadcrumb: 'users.form.editing', narrow: true },
            component: () => import('@/views/configuration/users/UserFormView.vue'),
          },
        ],
      },
    ],
  },
]
