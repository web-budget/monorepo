import { describe, expect, it } from 'vitest'
import { goalPercentage, goalSignal, meterWidth } from '@/utils/goalSignal'

describe('goalSignal', () => {
  it('treats the expense goal as a ceiling, amber from 90% and red above it', () => {
    expect(goalSignal('expense', 89, 100)).toBe('ok')
    expect(goalSignal('expense', 90, 100)).toBe('warn')
    expect(goalSignal('expense', 100, 100)).toBe('warn')
    expect(goalSignal('expense', 100.01, 100)).toBe('over')
  })

  it('treats the income goal as a floor, green when reached and amber below it', () => {
    expect(goalSignal('income', 100, 100)).toBe('ok')
    expect(goalSignal('income', 150, 100)).toBe('ok')
    expect(goalSignal('income', 99.99, 100)).toBe('warn')
  })
})

describe('goalPercentage and meterWidth', () => {
  it('gives the percentage of the goal and holds the bar between 0 and 100', () => {
    expect(goalPercentage(50, 200)).toBe(25)
    expect(meterWidth(50, 200)).toBe(25)
    expect(meterWidth(500, 200)).toBe(100)
    expect(meterWidth(-10, 200)).toBe(0)
  })
})
