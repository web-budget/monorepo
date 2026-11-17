import type { AxiosError, AxiosInstance } from 'axios'
import type { Router } from 'vue-router'
import { ApiError } from '@/api/client'
import { useNotification } from '@/composables/useNotification'
import { isPublicRoute } from '@/router/publicRoutes'
import { useAuthStore } from '@/stores/auth'
import { describeApiError } from '@/utils/apiErrorNotice'

const LOGIN_REJECTIONS = new Set(['invalid-credentials', 'account-disabled'])

function isSilent(error: ApiError): boolean {
  return (error.cause as AxiosError | undefined)?.config?.silent === true
}

async function handleUnauthenticated(error: ApiError, router: Router) {
  if (LOGIN_REJECTIONS.has(error.error ?? '')) {
    return
  }
  const auth = useAuthStore()
  if (auth.isAuthenticated) {
    await auth.expireSession('expired')
    return
  }
  auth.clearSession()
  const current = router.currentRoute.value
  if (!isPublicRoute(current)) {
    await router.push({ name: 'login', query: { redirect: current.fullPath } })
  }
}

async function handleApiError(error: ApiError, router: Router) {
  if (error.status === 401) {
    await handleUnauthenticated(error, router)
    return
  }
  if (error.status === 403 && error.error === 'forbidden') {
    await router.push({ name: '403' })
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
