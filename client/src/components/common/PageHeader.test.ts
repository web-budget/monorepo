import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'

describe('PageHeader', () => {
  it('gives the title a 36px line, as tall as the h-9 buttons, in the 2xl size of the design', () => {
    const wrapper = mount(PageHeader, { props: { title: 'Carteiras' } })

    const title = wrapper.find('[data-slot="page-title"]')
    expect(title.element.tagName).toBe('H1')
    expect(title.text()).toBe('Carteiras')
    expect(title.classes()).toEqual(expect.arrayContaining(['text-2xl', 'leading-9']))
    expect(title.classes()).not.toContain('text-xl')
  })

  it('aligns the title and the actions by the top', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Carteiras' },
      slots: { actions: () => h('button', 'Nova carteira') },
    })

    expect(wrapper.classes()).toContain('items-start')
    expect(wrapper.classes()).not.toContain('items-end')
    expect(wrapper.find('[data-slot="page-actions"]').text()).toBe('Nova carteira')
  })

  it('puts the description under the title when there is one', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Carteiras', description: 'Onde o dinheiro mora.' },
    })

    expect(wrapper.find('[data-slot="page-description"]').text()).toBe('Onde o dinheiro mora.')
  })

  it('has no description nor actions when it gets none', () => {
    const wrapper = mount(PageHeader, { props: { title: 'Carteiras' } })

    expect(wrapper.find('[data-slot="page-description"]').exists()).toBe(false)
    expect(wrapper.find('[data-slot="page-actions"]').exists()).toBe(false)
  })

  it('shows the badge next to the title', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Conta corrente' },
      slots: { badge: () => h('span', 'Ativo') },
    })

    expect(wrapper.find('[data-slot="page-title"]').element.parentElement!.textContent).toContain(
      'Ativo',
    )
  })
})
