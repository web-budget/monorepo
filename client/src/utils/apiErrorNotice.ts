import { ApiError } from '@/api/client'

export type NoticeSeverity = 'warn' | 'error'

export interface LocalizedMessage {
  key: string
  params?: Record<string, unknown>
}

export interface ApiErrorNotice {
  severity: NoticeSeverity
  title: LocalizedMessage
  details: LocalizedMessage[]
}

const UNKNOWN: ApiErrorNotice = {
  severity: 'error',
  title: { key: 'error.unknown.title' },
  details: [{ key: 'error.unknown.details' }],
}

const STATUSES_HANDLED_BY_NAVIGATION = new Set([401, 403])

function badRequest(error: ApiError): ApiErrorNotice {
  return {
    severity: error.error === 'data-integrity-violation' ? 'error' : 'warn',
    title: { key: 'error.bad-request.title' },
    details: [
      error.error
        ? { key: `error.bad-request.${error.error}`, params: error.parameters ?? {} }
        : { key: 'error.unknown.details' },
    ],
  }
}

function conflict(error: ApiError): ApiErrorNotice {
  return {
    severity: 'warn',
    title: { key: 'error.conflict.title' },
    details: Object.entries(error.parameters ?? {}).map(([field, value]) => ({
      key: `error.conflict.${field}`,
      params: { value },
    })),
  }
}

export function describeApiError(error: unknown): ApiErrorNotice | null {
  if (!(error instanceof ApiError)) {
    return UNKNOWN
  }
  const status = error.status
  if (status === null) {
    return {
      severity: 'error',
      title: { key: 'error.connection-failure.title' },
      details: [{ key: 'error.connection-failure.details' }],
    }
  }
  if (STATUSES_HANDLED_BY_NAVIGATION.has(status)) {
    return null
  }
  if (status >= 500) {
    return {
      severity: 'error',
      title: { key: 'error.server-error.detail' },
      details: [{ key: 'error.server-error.description' }],
    }
  }
  switch (status) {
    case 400:
      return badRequest(error)
    case 404:
      return {
        severity: 'warn',
        title: { key: 'error.not-found.detail' },
        details: [{ key: 'error.not-found.description' }],
      }
    case 409:
      return conflict(error)
    case 422:
      return {
        severity: 'warn',
        title: { key: 'error.unprocessable-entity.title' },
        details: [{ key: 'error.unprocessable-entity.details' }],
      }
    default:
      return UNKNOWN
  }
}
