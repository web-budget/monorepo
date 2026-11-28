import axios, { isAxiosError, isCancel } from 'axios'
import { recordServerActivity } from '@/api/serverActivity'
import type { ProblemDetail } from '@/types'

export class ApiError extends Error {
  readonly status: number | null
  readonly error: string | null
  readonly detail: string | null
  readonly parameters: Record<string, unknown> | null
  readonly cause: unknown

  constructor(problem: ProblemDetail | null, status: number | null, cause?: unknown) {
    super(problem?.detail ?? problem?.title ?? `Request failed with status ${status ?? 'unknown'}`)
    this.name = 'ApiError'
    this.status = status
    this.error = problem?.error ?? null
    this.detail = problem?.detail ?? null
    this.parameters = problem?.parameters ?? null
    this.cause = cause
  }

  get isNetworkError(): boolean {
    return this.status === null
  }

  get isUnavailable(): boolean {
    return this.status === null || this.status >= 500
  }
}

function asProblemDetail(body: unknown): ProblemDetail | null {
  return typeof body === 'object' && body !== null ? (body as ProblemDetail) : null
}

export function toApiError(error: unknown): unknown {
  if (isCancel(error) || !isAxiosError(error)) {
    return error
  }
  const response = error.response
  if (!response) {
    return new ApiError(null, null, error)
  }
  return new ApiError(asProblemDetail(response.data), response.status, error)
}

const CSRF_COOKIE_NAME = 'XSRF-TOKEN'
const SAFE_METHODS = new Set(['get', 'head', 'options', 'trace'])

export const apiClient = axios.create({
  baseURL: '/private/v1',
  timeout: 20000,
  xsrfCookieName: CSRF_COOKIE_NAME,
  xsrfHeaderName: 'X-XSRF-TOKEN',
})

function hasCsrfCookie(): boolean {
  return document.cookie.split('; ').some((cookie) => cookie.startsWith(`${CSRF_COOKIE_NAME}=`))
}

let csrfProbe: Promise<unknown> | null = null

function fetchCsrfCookie(): Promise<unknown> {
  csrfProbe ??= apiClient
    .get('/auth/session', { silent: true })
    .catch(() => undefined)
    .finally(() => {
      csrfProbe = null
    })
  return csrfProbe
}

apiClient.interceptors.request.use(async (config) => {
  if (!SAFE_METHODS.has((config.method ?? 'get').toLowerCase()) && !hasCsrfCookie()) {
    await fetchCsrfCookie()
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => {
    recordServerActivity()
    return response
  },
  (error: unknown) => {
    if (isAxiosError(error) && error.response) {
      recordServerActivity()
    }
    return Promise.reject(toApiError(error))
  },
)

declare module 'axios' {
  interface AxiosRequestConfig {
    silent?: boolean
  }
}
