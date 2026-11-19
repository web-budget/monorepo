import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from './client'

interface RecordedRequest {
  method: string
  url: string
  headers: Record<string, string>
}

const COOKIE = 'XSRF-TOKEN'

let requests: RecordedRequest[]
let sessionProbeStatus: number
const originalAdapter = apiClient.defaults.adapter

class FakeXhr {
  status = 200
  statusText = 'OK'
  readyState = 4
  responseText = '{}'
  response = '{}'
  responseURL = ''
  timeout = 0
  withCredentials = false
  responseType = ''
  onloadend: (() => void) | null = null
  upload = undefined
  private record: RecordedRequest = { method: '', url: '', headers: {} }

  open(method: string, url: string) {
    this.record = { method, url, headers: {} }
  }

  setRequestHeader(name: string, value: string) {
    this.record.headers[name] = value
  }

  getAllResponseHeaders() {
    return ''
  }

  addEventListener() {
    return undefined
  }

  removeEventListener() {
    return undefined
  }

  abort() {
    return undefined
  }

  send() {
    requests.push(this.record)
    if (this.record.url.endsWith('/auth/session')) {
      this.status = sessionProbeStatus
      document.cookie = `${COOKIE}=fresh-token`
    }
    queueMicrotask(() => this.onloadend?.())
  }
}

function forgetCookie() {
  document.cookie = `${COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

describe('apiClient CSRF protection', () => {
  beforeEach(() => {
    requests = []
    sessionProbeStatus = 200
    forgetCookie()
    vi.stubGlobal('XMLHttpRequest', FakeXhr)
    apiClient.defaults.adapter = 'xhr'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    apiClient.defaults.adapter = originalAdapter
    forgetCookie()
  })

  it('reads the token from the XSRF-TOKEN cookie and sends it in the X-XSRF-TOKEN header', () => {
    expect(apiClient.defaults.xsrfCookieName).toBe('XSRF-TOKEN')
    expect(apiClient.defaults.xsrfHeaderName).toBe('X-XSRF-TOKEN')
  })

  it.each(['post', 'put', 'patch', 'delete'] as const)(
    'sends the token of the cookie on a %s without any extra request',
    async (method) => {
      document.cookie = `${COOKIE}=known-token`

      await apiClient.request({ method, url: '/registration/wallets' })

      expect(requests).toHaveLength(1)
      expect(requests[0]?.headers['X-XSRF-TOKEN']).toBe('known-token')
    },
  )

  it('sends the token on the anonymous login too', async () => {
    document.cookie = `${COOKIE}=known-token`

    await apiClient.post('/auth/login', { email: 'a@b.c', password: 'secret' })

    expect(requests[0]?.headers['X-XSRF-TOKEN']).toBe('known-token')
  })

  it('asks the server for the cookie with a GET before the first POST that has none', async () => {
    await apiClient.post('/auth/login', { email: 'a@b.c', password: 'secret' })

    expect(requests.map(({ method, url }) => [method, url])).toEqual([
      ['GET', '/private/v1/auth/session'],
      ['POST', '/private/v1/auth/login'],
    ])
    expect(requests[1]?.headers['X-XSRF-TOKEN']).toBe('fresh-token')
  })

  it('goes on with the write when the probe is answered with a 401', async () => {
    sessionProbeStatus = 401

    await apiClient.patch('/accounts/activate', { token: 'a', email: 'a@b.c' })

    expect(requests.map(({ method }) => method)).toEqual(['GET', 'PATCH'])
    expect(requests[1]?.headers['X-XSRF-TOKEN']).toBe('fresh-token')
  })

  it('shares one probe between writes that start together', async () => {
    await Promise.all([apiClient.post('/a'), apiClient.post('/b')])

    expect(requests.map(({ method }) => method)).toEqual(['GET', 'POST', 'POST'])
  })

  it('probes again after the cookie is gone', async () => {
    await apiClient.post('/a')
    forgetCookie()
    await apiClient.post('/b')

    expect(requests.map(({ method }) => method)).toEqual(['GET', 'POST', 'GET', 'POST'])
  })

  it('does not probe before a read', async () => {
    await apiClient.get('/registration/wallets')

    expect(requests.map(({ method }) => method)).toEqual(['GET'])
  })

  it('does not take another cookie for the token', async () => {
    document.cookie = 'NOT-XSRF-TOKEN=other'

    await apiClient.post('/a')

    expect(requests.map(({ method }) => method)).toEqual(['GET', 'POST'])
    document.cookie = 'NOT-XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  })
})
