import { describe, expect, it } from 'vitest'
import { isHandled, markHandled } from '@/utils/handledErrors'

describe('handledErrors', () => {
  it('remembers the errors a screen has taken care of', () => {
    const handled = new Error('shown inline')
    const other = new Error('still unseen')

    markHandled(handled)

    expect(isHandled(handled)).toBe(true)
    expect(isHandled(other)).toBe(false)
  })

  it('ignores values that cannot be tracked', () => {
    markHandled('text')
    markHandled(null)

    expect(isHandled('text')).toBe(false)
    expect(isHandled(null)).toBe(false)
  })
})
