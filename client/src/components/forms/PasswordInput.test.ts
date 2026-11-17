import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PasswordInput from '@/components/forms/PasswordInput.vue'
import i18n from '@/locales'

function render() {
  return mount(PasswordInput, {
    props: { modelValue: 'secret' },
    attrs: { placeholder: 'Sua senha', id: 'field' },
    global: { plugins: [i18n] },
  })
}

describe('PasswordInput', () => {
  it('hides the value and passes its attributes to the input', () => {
    const input = render().find('input')

    expect(input.attributes('type')).toBe('password')
    expect(input.attributes('placeholder')).toBe('Sua senha')
    expect(input.attributes('id')).toBe('field')
  })

  it('reveals and hides the value with the toggle', async () => {
    const wrapper = render()
    const toggle = wrapper.find('button')

    expect(toggle.attributes('aria-label')).toBe('Mostrar senha')
    await toggle.trigger('click')
    expect(wrapper.find('input').attributes('type')).toBe('text')
    expect(toggle.attributes('aria-label')).toBe('Ocultar senha')
    expect(toggle.attributes('aria-pressed')).toBe('true')
    await toggle.trigger('click')
    expect(wrapper.find('input').attributes('type')).toBe('password')
  })

  it('emits what the user types', async () => {
    const wrapper = render()

    await wrapper.find('input').setValue('new-secret')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['new-secret'])
  })
})
