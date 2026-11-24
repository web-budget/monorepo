import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import i18n from '@/locales'

function render(props: {
  value: string
  type?: 'short' | 'long'
  fixTime?: boolean
  withTime?: boolean
}) {
  return mount(DateTimeDisplay, { props, global: { plugins: [i18n] } })
}

describe('DateTimeDisplay', () => {
  it('formats a timestamp in the short format by default', () => {
    expect(render({ value: '2025-03-05T12:00:00' }).text()).toBe('05/03/2025')
  })

  it('formats a plain date without shifting the day', () => {
    expect(render({ value: '2025-03-05', fixTime: true }).text()).toBe('05/03/2025')
  })

  it('formats in the long format', () => {
    expect(render({ value: '2025-03-05T12:30:00', type: 'long' }).text()).toContain('12:30')
  })

  it('adds the time of day when asked to', () => {
    expect(render({ value: '2025-03-05T09:41:00', withTime: true }).text()).toBe('05/03/2025 09:41')
  })
})
