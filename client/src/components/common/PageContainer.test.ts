import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import PageContainer from '@/components/common/PageContainer.vue'

describe('PageContainer', () => {
  it('stacks its blocks on a single full-width column with a 20px gap', () => {
    const wrapper = mount(PageContainer, { slots: { default: () => h('p', 'block') } })

    expect(wrapper.classes()).toEqual(expect.arrayContaining(['grid', 'grid-cols-1', 'gap-5']))
    expect(wrapper.html()).not.toContain('max-w-')
    expect(wrapper.text()).toBe('block')
  })

  it('lets the page replace the gap', () => {
    const wrapper = mount(PageContainer, { props: { class: 'gap-6' } })

    expect(wrapper.classes()).toContain('gap-6')
    expect(wrapper.classes()).not.toContain('gap-5')
  })
})
