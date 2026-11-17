import { mount } from '@vue/test-utils'
import { useForm } from 'vee-validate'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import StatusToggle from '@/components/forms/StatusToggle.vue'
import i18n from '@/locales'

function render(initial: boolean) {
  let values: () => Record<string, unknown> = () => ({})
  const Host = defineComponent({
    setup() {
      const form = useForm({ initialValues: { active: initial } })
      values = () => form.values
      return () => h(StatusToggle, { name: 'active' })
    },
  })
  const wrapper = mount(Host, { global: { plugins: [i18n] } })
  return { wrapper, values: () => values() }
}

describe('StatusToggle', () => {
  it('shows the form value as the pressed option', () => {
    const { wrapper } = render(true)

    const [active, inactive] = wrapper.findAll('button')
    expect(active!.text()).toBe('Ativo')
    expect(active!.attributes('aria-pressed')).toBe('true')
    expect(inactive!.attributes('aria-pressed')).toBe('false')
  })

  it('writes the chosen option back to the form', async () => {
    const { wrapper, values } = render(true)

    await wrapper.findAll('button')[1]!.trigger('click')

    expect(values().active).toBe(false)
    expect(wrapper.findAll('button')[1]!.attributes('aria-pressed')).toBe('true')

    await wrapper.findAll('button')[0]!.trigger('click')

    expect(values().active).toBe(true)
  })
})
