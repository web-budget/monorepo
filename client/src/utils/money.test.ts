import { describe, expect, it } from 'vitest'
import { parseMoneyInput } from '@/utils/money'

describe('parseMoneyInput', () => {
  it.each([
    ['1234567', '', 12345.67],
    ['R$ 12.345,678', 'R$ 12.345,67', 123456.78],
    ['R$ 0,05', 'R$ 0,00', 0.05],
    ['R$ 0,00', '', 0],
    ['R$ 0,00', 'R$ 0,00', 0],
    ['abc', '', null],
    ['', 'R$ 1,00', null],
  ])('reads %j shown as %j as %j', (text, displayed, expected) => {
    expect(parseMoneyInput(text, displayed)).toBe(expected)
  })

  it('clears the field when deleting down to zero', () => {
    expect(parseMoneyInput('R$ 0,0', 'R$ 0,01')).toBeNull()
  })

  it('ignores digits beyond the limit', () => {
    expect(parseMoneyInput('12345678901234', '')).toBe(12345678901.23)
  })
})
