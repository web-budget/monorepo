import { afterEach, describe, expect, it } from 'vitest'
import {
  AxiosError,
  CanceledError,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios'
import { ApiError, apiClient, toApiError } from './client'

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
