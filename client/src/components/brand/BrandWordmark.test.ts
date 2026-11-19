import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BrandWordmark from '@/components/brand/BrandWordmark.vue'

describe('BrandWordmark', () => {
  it('reads webBudget with no space between the halves', () => {
    expect(mount(BrandWordmark).text()).toBe('webBudget')
  })

  it('marks only the Budget half', () => {
    const wrapper = mount(BrandWordmark)

    expect(wrapper.find('.marker').text()).toBe('Budget')
    expect(wrapper.findAll('.marker')).toHaveLength(1)
  })
})
