import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AxiosError,
  CanceledError,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios'
import { ApiError, apiClient, toApiError } from './client'
import { lastServerActivityAt } from './serverActivity'

const originalAdapter = apiClient.defaults.adapter
const requestConfig = { headers: {} } as InternalAxiosRequestConfig

function failedWith(status: number, data: unknown): AxiosError {
  return new AxiosError('Request failed', String(status), requestConfig, null, {
    status,
    statusText: '',
    headers: {},
    config: requestConfig,
    data,
  })
}

function rejectWith(status: number, data: unknown): AxiosAdapter {
  return () => Promise.reject(failedWith(status, data))
}

describe('apiClient', () => {
  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
  })

  it('targets the private v1 API on the same origin', () => {
    expect(apiClient.defaults.baseURL).toBe('/private/v1')
    expect(apiClient.defaults.withCredentials).toBeFalsy()
  })

  it('resolves successful responses untouched', async () => {
    apiClient.defaults.adapter = (config) =>
      Promise.resolve({ data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config })

    const response = await apiClient.get('/ping')

    expect(response.data).toEqual({ ok: true })
  })

  it('rejects with an ApiError built from the ProblemDetail body', async () => {
    apiClient.defaults.adapter = rejectWith(409, {
      title: 'Conflict',
      status: 409,
      detail: 'Name already in use',
      error: 'duplicated-property',
      parameters: { 'wallet.name': 'Main' },
    })

    const rejection: unknown = await apiClient.get('/registration/wallets').catch((error) => error)

    expect(rejection).toBeInstanceOf(ApiError)
    expect(rejection).toMatchObject({
      name: 'ApiError',
      message: 'Name already in use',
      status: 409,
      error: 'duplicated-property',
      detail: 'Name already in use',
      parameters: { 'wallet.name': 'Main' },
      isNetworkError: false,
    })
  })
})

describe('toApiError', () => {
  it('keeps the original axios error as the cause', () => {
    const original = failedWith(400, {})

    expect((toApiError(original) as ApiError).cause).toBe(original)
  })

  it('treats a missing response as a network error', () => {
    const error = toApiError(
      new AxiosError('Network Error', 'ERR_NETWORK', requestConfig),
    ) as ApiError

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBeNull()
    expect(error.isNetworkError).toBe(true)
    expect(error.message).toBe('Request failed with status unknown')
  })

  it('falls back to the title when the problem has no detail', () => {
    const error = toApiError(failedWith(500, { title: 'Internal Server Error' })) as ApiError

    expect(error.message).toBe('Internal Server Error')
    expect(error.detail).toBeNull()
    expect(error.error).toBeNull()
    expect(error.parameters).toBeNull()
  })

  it('ignores a body that is not a ProblemDetail', () => {
    const error = toApiError(failedWith(502, '<html>Bad Gateway</html>')) as ApiError

    expect(error.status).toBe(502)
    expect(error.message).toBe('Request failed with status 502')
    expect(error.detail).toBeNull()
  })

  it('ignores an empty body', () => {
    const error = toApiError(failedWith(404, null)) as ApiError

    expect(error.status).toBe(404)
    expect(error.error).toBeNull()
  })

  it('passes cancellations through untouched', () => {
    const canceled = new CanceledError()

    expect(toApiError(canceled)).toBe(canceled)
  })

  it('passes errors that did not come from axios through untouched', () => {
    const error = new TypeError('boom')

    expect(toApiError(error)).toBe(error)
  })
})

describe('apiClient server activity', () => {
  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
    vi.useRealTimers()
  })

  it('stamps the time of a successful response', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'))
    apiClient.defaults.adapter = (config) =>
      Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config })

    await apiClient.get('/ping')

    expect(lastServerActivityAt()).toBe(new Date('2026-01-01T10:00:00Z').getTime())
  })

  it('stamps the time of an error the server answered', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T11:00:00Z'))
    apiClient.defaults.adapter = rejectWith(500, {})

    await apiClient.get('/ping').catch(() => undefined)

    expect(lastServerActivityAt()).toBe(new Date('2026-01-01T11:00:00Z').getTime())
  })

  it('does not stamp a request the server never answered', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'))
    const before = lastServerActivityAt()
    apiClient.defaults.adapter = () =>
      Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK', requestConfig))

    await apiClient.get('/ping').catch(() => undefined)

    expect(lastServerActivityAt()).toBe(before)
  })
})
