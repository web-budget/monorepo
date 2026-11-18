import { describe, expect, it } from 'vitest'
import { meetsPasswordRequirements, passwordRequirementStatus } from '@/utils/passwordRules'

describe('passwordRules', () => {
  it('reports each requirement on its own', () => {
    expect(passwordRequirementStatus('')).toEqual({
      minLength: false,
      uppercase: false,
      number: false,
    })
    expect(passwordRequirementStatus('caderno')).toMatchObject({ minLength: false })
    expect(passwordRequirementStatus('Caderno')).toMatchObject({ uppercase: true, number: false })
    expect(passwordRequirementStatus('caderno1')).toEqual({
      minLength: true,
      uppercase: false,
      number: true,
    })
  })

  it('rejects a password above the maximum length', () => {
    expect(passwordRequirementStatus(`A1${'a'.repeat(127)}`).minLength).toBe(false)
    expect(passwordRequirementStatus(`A1${'a'.repeat(126)}`).minLength).toBe(true)
  })

  it('accepts a password that meets every requirement', () => {
    expect(meetsPasswordRequirements('Caderno12')).toBe(true)
    expect(meetsPasswordRequirements('caderno12')).toBe(false)
    expect(meetsPasswordRequirements('Caderno')).toBe(false)
    expect(meetsPasswordRequirements('Cad1')).toBe(false)
  })
})
