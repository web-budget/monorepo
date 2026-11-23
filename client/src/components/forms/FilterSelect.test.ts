import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import { Select } from '@/components/ui/select'
import i18n from '@/locales'

function render(modelValue: string) {
  return mount(FilterSelect, {
    props: {
      label: 'Tipo',
      noneLabel: 'Todos',
      options: [{ label: 'Receitas', value: 'INCOME' }],
      modelValue,
    },
    global: { plugins: [i18n] },
  })
}

describe('FilterSelect', () => {
  it('shows its label and treats an empty value as the none option', () => {
    const wrapper = render('')

    expect(wrapper.text()).toContain('Tipo')
    expect(wrapper.getComponent(Select).props('modelValue')).toBe('__none__')
  })

  it('passes a chosen value through', () => {
    expect(render('INCOME').getComponent(Select).props('modelValue')).toBe('INCOME')
  })

  it('emits a value when one is chosen and an empty one for the none option', () => {
    const wrapper = render('')

    wrapper.getComponent(Select).vm.$emit('update:modelValue', 'INCOME')
    wrapper.getComponent(Select).vm.$emit('update:modelValue', '__none__')

    expect(wrapper.emitted('update:modelValue')).toEqual([['INCOME'], ['']])
  })
})
