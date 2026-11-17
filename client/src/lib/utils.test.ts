import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it('joins class names and drops falsy values', () => {
    expect(cn('a', { b: false, c: true }, undefined)).toBe('a c')
  })

  it('lets the last conflicting Tailwind utility win', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})
