import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import FormSection from '@/components/forms/FormSection.vue'

describe('FormSection', () => {
  it('shows the title in text-base semibold, the help under it and the fields in the slot', () => {
    const wrapper = mount(FormSection, {
      props: { title: 'Identificação', description: 'O nome da carteira.' },
      slots: { default: () => h('input', { 'aria-label': 'Nome' }) },
    })

    const title = wrapper.find('h2')
    expect(title.text()).toBe('Identificação')
    expect(title.classes()).toEqual(expect.arrayContaining(['text-base', 'font-semibold']))
    expect(title.classes()).not.toContain('text-sm')
    expect(wrapper.text()).toContain('O nome da carteira.')
    expect(wrapper.find('input[aria-label="Nome"]').exists()).toBe(true)
  })

  it('has no help text when it gets none', () => {
    const wrapper = mount(FormSection, { props: { title: 'Orçamento' } })

    expect(wrapper.find('p').exists()).toBe(false)
  })

  it('puts the title in a 220px column, or on top when stacked', () => {
    const grid = mount(FormSection, { props: { title: 'Dados' } })
    const stacked = mount(FormSection, { props: { title: 'Dados', stacked: true } })

    expect(grid.find('section').classes()).toContain('md:grid-cols-[220px_minmax(0,1fr)]')
    expect(stacked.find('section').classes()).not.toContain('md:grid-cols-[220px_minmax(0,1fr)]')
  })

  it('paints the background of a conditional section', () => {
    const wrapper = mount(FormSection, { props: { title: 'Fatura', conditional: true } })

    expect(wrapper.find('section').classes()).toContain('bg-accent/35')
  })
})
