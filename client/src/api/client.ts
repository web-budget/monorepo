import axios, { isAxiosError, isCancel } from 'axios'
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

export const apiClient = axios.create({
  baseURL: '/private/v1',
  timeout: 20000,
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
)
