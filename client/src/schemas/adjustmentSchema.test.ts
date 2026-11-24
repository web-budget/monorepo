import { describe, expect, it } from 'vitest'
import { adjustmentSchema, toAdjustmentForm } from '@/schemas/adjustmentSchema'

describe('adjustmentSchema', () => {
  it.each([[0.03], [-0.02], ['0.5'], ['-1']])('accepts %s', (value) => {
    expect(adjustmentSchema.safeParse({ value, name: 'Arredondamento' }).success).toBe(true)
  })

  it.each([[0], ['0'], [''], [null], [undefined]])('refuses %s', (value) => {
    expect(adjustmentSchema.safeParse({ value, name: 'Arredondamento' }).success).toBe(false)
  })

  it('asks for the reason', () => {
    expect(adjustmentSchema.safeParse({ value: 1, name: '' }).success).toBe(false)
  })

  it('builds the form for the server', () => {
    expect(toAdjustmentForm({ value: 0.03, name: 'x' })).toEqual({ value: 0.03, name: 'x' })
  })
})
