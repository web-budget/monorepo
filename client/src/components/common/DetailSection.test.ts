import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import DetailSection from '@/components/common/DetailSection.vue'

describe('DetailSection', () => {
  it('shows the title in text-base semibold and the fields in a description list', () => {
    const wrapper = mount(DetailSection, {
      props: { title: 'Dados do banco' },
      slots: { default: () => h('div', 'Banco do Brasil') },
    })

    const title = wrapper.find('h2')
    expect(title.text()).toBe('Dados do banco')
    expect(title.classes()).toEqual(expect.arrayContaining(['text-base', 'font-semibold']))
    expect(title.classes()).not.toContain('text-sm')
    expect(wrapper.find('dl').text()).toBe('Banco do Brasil')
  })

  it('takes the column layout of the fields', () => {
    const wrapper = mount(DetailSection, {
      props: { title: 'Dados do banco', columns: 'md:grid-cols-3' },
    })

    expect(wrapper.find('dl').classes()).toContain('md:grid-cols-3')
    expect(wrapper.find('dl').classes()).not.toContain('md:grid-cols-2')
  })
})
