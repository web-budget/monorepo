import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DetailField from '@/components/common/DetailField.vue'

describe('DetailField', () => {
  it('shows the label and the value', () => {
    const wrapper = mount(DetailField, { props: { label: 'Nome', value: 'Main' } })

    expect(wrapper.find('dt').text()).toBe('Nome')
    expect(wrapper.find('dd').text()).toBe('Main')
  })

  it('shows zero as a value', () => {
    expect(
      mount(DetailField, { props: { label: 'Dia', value: 0 } })
        .find('dd')
        .text(),
    ).toBe('0')
  })

  it.each([[undefined], [null], ['']])('shows a placeholder for %j', (value) => {
    expect(
      mount(DetailField, { props: { label: 'Nome', value } })
        .find('dd')
        .text(),
    ).toBe('---')
  })

  it('prefers the slot', () => {
    const wrapper = mount(DetailField, {
      props: { label: 'Nome', value: 'ignored' },
      slots: { default: '<b>custom</b>' },
    })

    expect(wrapper.find('dd').html()).toContain('<b>custom</b>')
  })
})
