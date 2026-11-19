import { ApiError } from '@/api/client'
import i18n, { DEFAULT_LOCALE } from '@/locales'

export type NoticeSeverity = 'warn' | 'error'

export interface LocalizedMessage {
  key: string
  params?: Record<string, unknown>
  field?: string
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

const UNKNOWN_DETAIL: LocalizedMessage = { key: 'error.unknown.details' }

function isKnownMessage(key: string): boolean {
  return i18n.global.te(key, DEFAULT_LOCALE)
}

function badRequest(error: ApiError): ApiErrorNotice {
  const key = `error.bad-request.${error.error}`
  return {
    severity: error.error === 'data-integrity-violation' ? 'error' : 'warn',
    title: { key: 'error.bad-request.title' },
    details: [
      error.error !== null && isKnownMessage(key)
        ? { key, params: error.parameters ?? {} }
        : UNKNOWN_DETAIL,
    ],
  }
}

function conflictField(parameter: string): string {
  return parameter
    .slice(parameter.indexOf('.') + 1)
    .replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

function conflict(error: ApiError): ApiErrorNotice {
  if (error.error === 'invalid-user-status-transition') {
    return {
      severity: 'warn',
      title: { key: 'error.conflict.title' },
      details: [{ key: 'error.conflict.invalid-user-status-transition' }],
    }
  }
  const details = Object.entries(error.parameters ?? {})
    .map(([parameter, value]) => ({
      key: `error.conflict.${parameter}`,
      params: { value },
      field: conflictField(parameter),
    }))
    .filter(({ key }) => isKnownMessage(key))
  return {
    severity: 'warn',
    title: { key: 'error.conflict.title' },
    details: details.length > 0 ? details : [UNKNOWN_DETAIL],
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
  if (status === 403 && error.error === 'invalid-csrf-token') {
    return {
      severity: 'error',
      title: { key: 'error.invalid-csrf-token.title' },
      details: [{ key: 'error.invalid-csrf-token.details' }],
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
