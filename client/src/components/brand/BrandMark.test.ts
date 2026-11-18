import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BrandMark from '@/components/brand/BrandMark.vue'

describe('BrandMark', () => {
  it('is decorative and has no text', () => {
    const wrapper = mount(BrandMark)

    expect(wrapper.attributes('aria-hidden')).toBe('true')
    expect(wrapper.text()).toBe('')
  })

  it('is 24px by default', () => {
    const wrapper = mount(BrandMark)

    expect(wrapper.attributes('width')).toBe('24')
    expect(wrapper.attributes('height')).toBe('24')
  })

  it('takes the given size', () => {
    const wrapper = mount(BrandMark, { props: { size: 40 } })

    expect(wrapper.attributes('width')).toBe('40')
    expect(wrapper.attributes('height')).toBe('40')
  })

  it('is painted with the theme tokens', () => {
    const wrapper = mount(BrandMark)

    expect(wrapper.find('rect').attributes('fill')).toBe('var(--primary)')
    expect(wrapper.find('path').attributes('fill')).toBe('var(--primary-foreground)')
    expect(wrapper.findAll('rect')[1]?.attributes('fill')).toBe('var(--highlight)')
  })
})
