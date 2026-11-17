import type { AxiosError, AxiosInstance } from 'axios'
import type { Router } from 'vue-router'
import { ApiError } from '@/api/client'
import { useNotification } from '@/composables/useNotification'
import { isPublicRoute } from '@/router/publicRoutes'
import { useAuthStore } from '@/stores/auth'
import { describeApiError } from '@/utils/apiErrorNotice'

function isSilent(error: ApiError): boolean {
  return (error.cause as AxiosError | undefined)?.config?.silent === true
}

async function handleApiError(error: ApiError, router: Router) {
  if (error.status === 401) {
    useAuthStore().clearSession()
    const current = router.currentRoute.value
    if (!isPublicRoute(current)) {
      await router.push({ name: 'login', query: { redirect: current.fullPath } })
    }
    return
  }
  const notice = describeApiError(error)
  if (notice) {
    useNotification().showApiNotice(notice)
  }
}

export function installApiErrorHandler(client: AxiosInstance, router: Router) {
  client.interceptors.response.use(undefined, async (error: unknown) => {
    if (error instanceof ApiError && !isSilent(error)) {
      await handleApiError(error, router)
    }
    return Promise.reject(error)
  })
}
