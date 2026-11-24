import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
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
    expect((input.element as HTMLInputElement).value).toBe('210,00')
    expect(wrapper.text()).toBe('R$')
  })

  it('shows nothing for an empty value', () => {
    expect((render(null).find('input').element as HTMLInputElement).value).toBe('')
  })

  it('reads the digits as cents and emits the amount', async () => {
    const wrapper = render(null)

    await wrapper.find('input').setValue('12345')

    expect(wrapper.emitted('update:modelValue')![0]).toEqual([123.45])
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('123,45')
  })

  it('is dimmed and locked when disabled', () => {
    const wrapper = mount(MoneyInput, {
      props: { modelValue: 10, label: 'Valor', disabled: true },
      global: { plugins: createTestPlugins().plugins },
    })

    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-slot="input-group"]').classes()).toContain('opacity-50')
  })

  it('does not pass the click on to the row around it', async () => {
    const onRowClick = vi.fn<() => void>()
    const wrapper = mount(
      {
        components: { MoneyInput },
        template: '<div @click="onRowClick"><MoneyInput :model-value="1" label="Valor" /></div>',
        setup: () => ({ onRowClick }),
      },
      { global: { plugins: createTestPlugins().plugins } },
    )

    await wrapper.find('input').trigger('click')

    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('emits null when the text is cleared', async () => {
    const wrapper = render(10)

    await wrapper.find('input').setValue('')

    expect(wrapper.emitted('update:modelValue')![0]).toEqual([null])
  })
})
