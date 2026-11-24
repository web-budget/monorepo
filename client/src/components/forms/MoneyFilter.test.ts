import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MoneyFilter from '@/components/forms/MoneyFilter.vue'
import i18n from '@/locales'

function render(modelValue: string) {
  const wrapper = mount(MoneyFilter, {
    props: {
      id: 'min',
      label: 'Valor mínimo',
      modelValue,
      'onUpdate:modelValue': (value: string) => wrapper.setProps({ modelValue: value }),
    },
    global: { plugins: [i18n] },
  })
  return wrapper
}

function shown(wrapper: ReturnType<typeof render>) {
  return (wrapper.find('input').element as HTMLInputElement).value
}

describe('MoneyFilter', () => {
  it('labels the field, shows the R$ addon and the placeholder', () => {
    const wrapper = render('')

    expect(wrapper.find('label').text()).toBe('Valor mínimo')
    expect(wrapper.find('label').attributes('for')).toBe('min')
    expect(wrapper.text()).toContain('R$')
    expect(wrapper.find('input').attributes('placeholder')).toBe('0,00')
    expect(shown(wrapper)).toBe('')
  })

  it('shows the amount without the currency symbol', () => {
    expect(shown(render('1500.5'))).toBe('1.500,50')
  })

  it('formats while typing and emits the amount as text', async () => {
    const wrapper = render('')

    await wrapper.find('input').setValue('1234567')

    expect(shown(wrapper)).toBe('12.345,67')
    expect(wrapper.emitted('update:modelValue')!.slice(-1)[0]).toEqual(['12345.67'])
  })

  it('empties the model when the text is cleared', async () => {
    const wrapper = render('12.34')

    await wrapper.find('input').setValue('')

    expect(wrapper.emitted('update:modelValue')!.slice(-1)[0]).toEqual([''])
    expect(shown(wrapper)).toBe('')
  })
})
