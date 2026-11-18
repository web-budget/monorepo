import { describe, expect, it } from 'vitest'
import { safeRedirect } from '@/utils/safeRedirect'

describe('safeRedirect', () => {
  it.each(['/registration/wallets', '/', '/financial?tab=1'])(
    'keeps the internal path %s',
    (path) => {
      expect(safeRedirect(path)).toBe(path)
    },
  )

  it.each([
    ['an absolute url', 'https://evil.example'],
    ['a protocol-relative url', '//evil.example'],
    ['a backslash host', '/' + String.fromCharCode(92) + 'evil.example'],
    ['a relative path', 'registration'],
    ['an empty string', ''],
    ['nothing', undefined],
    ['null', null],
    ['a list', ['/a', '/b']],
  ])('rejects %s', (_label, value) => {
    expect(safeRedirect(value)).toBeNull()
  })
})
