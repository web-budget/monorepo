import { createRouter, createWebHistory } from 'vue-router'
import HomeLayout from '@/components/layout/HomeLayout.vue'
import { configurationRoutes } from '@/router/configurationRoutes'
import { dashboardsRoutes } from '@/router/dashboardsRoutes'
import { financialRoutes } from '@/router/financialRoutes'
import { authGuard } from '@/router/guard'
import { publicRoutes } from '@/router/publicRoutes'
import { registrationRoutes } from '@/router/registrationRoutes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: HomeLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/HomeView.vue'),
        },
      ],
    },
    ...publicRoutes,
    ...dashboardsRoutes,
    ...registrationRoutes,
    ...financialRoutes,
    ...configurationRoutes,
  ],
})

router.beforeEach(authGuard)

export default router
