import type { AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import { createdId } from '@/api/createdId'

function responseWith(location?: string) {
  return { headers: location === undefined ? {} : { location } } as unknown as AxiosResponse
}

describe('createdId', () => {
  it('reads the id from the last segment of the location header', () => {
    expect(
      createdId(responseWith('http://localhost/private/v1/registration/wallets/abc-123')),
    ).toBe('abc-123')
  })

  it('ignores a trailing slash', () => {
    expect(createdId(responseWith('/private/v1/registration/wallets/abc-123/'))).toBe('abc-123')
  })

  it('returns an empty id when the server sent no location', () => {
    expect(createdId(responseWith())).toBe('')
  })
})
