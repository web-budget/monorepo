import { describe, expect, it } from 'vitest'
import { isCompleteTotpCode, TOTP_CODE_LENGTH } from '@/utils/totpCode'

describe('totpCode', () => {
  it('has six digits', () => {
    expect(TOTP_CODE_LENGTH).toBe(6)
  })

  it('is complete only with every digit', () => {
    expect(isCompleteTotpCode('')).toBe(false)
    expect(isCompleteTotpCode('12345')).toBe(false)
    expect(isCompleteTotpCode('123456')).toBe(true)
  })
})
