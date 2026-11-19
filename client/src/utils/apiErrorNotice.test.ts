import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/client'
import type { ProblemDetail } from '@/types'
import { describeApiError } from './apiErrorNotice'

function apiError(status: number | null, problem: ProblemDetail | null = null): ApiError {
  return new ApiError(problem, status)
}

describe('describeApiError', () => {
  it('reports a connection failure when the server could not be reached', () => {
    expect(describeApiError(apiError(null))).toEqual({
      severity: 'error',
      title: { key: 'error.connection-failure.title' },
      details: [{ key: 'error.connection-failure.details' }],
    })
  })

  it.each([401, 403])('leaves %i to the navigation that handles it', (status) => {
    expect(describeApiError(apiError(status))).toBeNull()
  })

  it('reports a rejected CSRF token, which no navigation can fix', () => {
    expect(describeApiError(apiError(403, { error: 'invalid-csrf-token' }))).toEqual({
      severity: 'error',
      title: { key: 'error.invalid-csrf-token.title' },
      details: [{ key: 'error.invalid-csrf-token.details' }],
    })
  })

  it.each([500, 503])('reports a server failure on %i', (status) => {
    expect(describeApiError(apiError(status))).toEqual({
      severity: 'error',
      title: { key: 'error.server-error.detail' },
      details: [{ key: 'error.server-error.description' }],
    })
  })

  it('warns about a bad request using its error code and parameters', () => {
    const notice = describeApiError(
      apiError(400, { error: 'invalid-invoice-payment-day', parameters: { 'payment-day': 31 } }),
    )

    expect(notice).toEqual({
      severity: 'warn',
      title: { key: 'error.bad-request.title' },
      details: [
        { key: 'error.bad-request.invalid-invoice-payment-day', params: { 'payment-day': 31 } },
      ],
    })
  })

  it('passes no parameters when the bad request has none', () => {
    const notice = describeApiError(apiError(400, { error: 'start-date-after-end-date' }))

    expect(notice?.details).toEqual([
      { key: 'error.bad-request.start-date-after-end-date', params: {} },
    ])
  })

  it('reports a data integrity violation as an error', () => {
    expect(describeApiError(apiError(400, { error: 'data-integrity-violation' }))?.severity).toBe(
      'error',
    )
  })

  it('falls back to the unknown detail on a bad request without a code', () => {
    expect(describeApiError(apiError(400))?.details).toEqual([{ key: 'error.unknown.details' }])
  })

  it.each(['some-new-server-code', 'title.nested', ''])(
    'never shows the raw key for the unknown code "%s"',
    (code) => {
      const notice = describeApiError(apiError(400, { error: code, parameters: { a: 1 } }))

      expect(notice?.details).toEqual([{ key: 'error.unknown.details' }])
    },
  )

  it('does not take a message group for a message', () => {
    expect(describeApiError(apiError(400, { error: '../conflict' }))?.details).toEqual([
      { key: 'error.unknown.details' },
    ])
  })

  it('warns about a missing resource', () => {
    expect(describeApiError(apiError(404))).toEqual({
      severity: 'warn',
      title: { key: 'error.not-found.detail' },
      details: [{ key: 'error.not-found.description' }],
    })
  })

  it('lists one message per conflicting field', () => {
    const notice = describeApiError(
      apiError(409, { parameters: { 'wallet.name': 'Main', 'wallet.number': '123' } }),
    )

    expect(notice).toEqual({
      severity: 'warn',
      title: { key: 'error.conflict.title' },
      details: [
        { key: 'error.conflict.wallet.name', params: { value: 'Main' }, field: 'name' },
        { key: 'error.conflict.wallet.number', params: { value: '123' }, field: 'number' },
      ],
    })
  })

  it('drops conflicting fields that have no message', () => {
    const notice = describeApiError(
      apiError(409, { parameters: { 'wallet.name': 'Main', 'wallet.color': 'blue' } }),
    )

    expect(notice?.details).toEqual([
      { key: 'error.conflict.wallet.name', params: { value: 'Main' }, field: 'name' },
    ])
  })

  it('falls back to the unknown detail when no conflicting field has a message', () => {
    expect(
      describeApiError(apiError(409, { parameters: { 'wallet.color': 'blue', wallet: 'x' } }))
        ?.details,
    ).toEqual([{ key: 'error.unknown.details' }])
  })

  it('falls back to the unknown detail on a conflict without parameters', () => {
    expect(describeApiError(apiError(409))?.details).toEqual([{ key: 'error.unknown.details' }])
  })

  it('warns about an unprocessable entity', () => {
    expect(describeApiError(apiError(422))).toEqual({
      severity: 'warn',
      title: { key: 'error.unprocessable-entity.title' },
      details: [{ key: 'error.unprocessable-entity.details' }],
    })
  })

  it('reports any other status as unknown', () => {
    expect(describeApiError(apiError(418))).toEqual({
      severity: 'error',
      title: { key: 'error.unknown.title' },
      details: [{ key: 'error.unknown.details' }],
    })
  })

  it('reports an error that is not an ApiError as unknown', () => {
    expect(describeApiError(new TypeError('boom'))?.title).toEqual({ key: 'error.unknown.title' })
  })
})
