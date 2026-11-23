import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MoneyInput from '@/components/forms/MoneyInput.vue'
import { createTestPlugins } from '@/test/mounting'

function render(modelValue: number | null) {
  return mount(MoneyInput, {
    props: { modelValue, label: 'Valor de Energia' },
    global: { plugins: createTestPlugins().plugins },
  })
}

describe('MoneyInput', () => {
  it('shows the value as money, with the label for assistive technology', () => {
    const wrapper = render(210)

    const input = wrapper.find('input')
    expect(input.attributes('aria-label')).toBe('Valor de Energia')
    expect((input.element as HTMLInputElement).value).toMatch(/R\$\s*210,00/)
  })

  it('shows nothing for an empty value', () => {
    expect((render(null).find('input').element as HTMLInputElement).value).toBe('')
  })

  it('reads the digits as cents and emits the amount', async () => {
    const wrapper = render(null)

    await wrapper.find('input').setValue('12345')

    expect(wrapper.emitted('update:modelValue')![0]).toEqual([123.45])
    expect((wrapper.find('input').element as HTMLInputElement).value).toMatch(/R\$\s*123,45/)
  })

  it('emits null when the text is cleared', async () => {
    const wrapper = render(10)

    await wrapper.find('input').setValue('')

    expect(wrapper.emitted('update:modelValue')![0]).toEqual([null])
  })
})
