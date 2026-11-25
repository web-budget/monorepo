import { mount } from '@vue/test-utils'
import { useForm } from 'vee-validate'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import InputField from '@/components/forms/InputField.vue'
import i18n from '@/locales'

function render(props: Record<string, unknown>) {
  const Host = defineComponent({
    setup() {
      useForm({ initialValues: { field: '' } })
      return () => h(InputField, { name: 'field', label: 'Campo', ...props })
    },
  })
  return mount(Host, { global: { plugins: [i18n] }, attachTo: document.body })
}

describe('InputField', () => {
  afterEach(() => {
    Reflect.deleteProperty(HTMLInputElement.prototype, 'showPicker')
  })

  it('opens the calendar when a date field is clicked', async () => {
    const showPicker = vi.fn<() => void>()
    HTMLInputElement.prototype.showPicker = showPicker
    const wrapper = render({ type: 'date' })

    await wrapper.find('input').trigger('click')

    expect(showPicker).toHaveBeenCalledTimes(1)
  })

  it('does not open the calendar when the date field only receives focus', async () => {
    const showPicker = vi.fn<() => void>()
    HTMLInputElement.prototype.showPicker = showPicker
    const wrapper = render({ type: 'date' })

    await wrapper.find('input').trigger('focus')

    expect(showPicker).not.toHaveBeenCalled()
  })

  it('does not open anything for other kinds of field', async () => {
    const showPicker = vi.fn<() => void>()
    HTMLInputElement.prototype.showPicker = showPicker
    const wrapper = render({ type: 'text' })

    await wrapper.find('input').trigger('click')

    expect(showPicker).not.toHaveBeenCalled()
  })

  it('keeps working when the browser has no picker or refuses to open it', async () => {
    const wrapper = render({ type: 'date' })
    await wrapper.find('input').trigger('click')

    HTMLInputElement.prototype.showPicker = () => {
      throw new DOMException('no gesture', 'NotAllowedError')
    }
    await wrapper.find('input').trigger('click')

    expect(wrapper.find('input').exists()).toBe(true)
  })
})
