import { createRouter, createWebHistory } from 'vue-router'
import { configurationRoutes } from '@/router/configurationRoutes'
import { dashboardsRoutes } from '@/router/dashboardsRoutes'
import { financialRoutes } from '@/router/financialRoutes'
import { authGuard } from '@/router/guard'
import { profileRoutes } from '@/router/profileRoutes'
import { publicRoutes } from '@/router/publicRoutes'
import { registrationRoutes } from '@/router/registrationRoutes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'start', children: [] },
    ...publicRoutes,
    ...dashboardsRoutes,
    ...registrationRoutes,
    ...financialRoutes,
    ...configurationRoutes,
    ...profileRoutes,
  ],
})

router.beforeEach(authGuard)

export default router
