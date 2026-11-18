import { mount } from '@vue/test-utils'
import { useForm } from 'vee-validate'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import StatusToggle from '@/components/forms/StatusToggle.vue'
import i18n from '@/locales'

function render(initial: boolean, props: Record<string, unknown> = {}) {
  let values: () => Record<string, unknown> = () => ({})
  const Host = defineComponent({
    setup() {
      const form = useForm({ initialValues: { active: initial } })
      values = () => form.values
      return () => h(StatusToggle, { name: 'active', ...props })
    },
  })
  const wrapper = mount(Host, { global: { plugins: [i18n] } })
  return { wrapper, values: () => values() }
}

describe('StatusToggle', () => {
  it('shows the form value as a switch with the generic label', () => {
    const { wrapper } = render(true)

    expect(wrapper.text()).toContain('Situação')
    expect(wrapper.text()).toContain('Ativo')
    expect(wrapper.find('button[role="switch"]').attributes('aria-checked')).toBe('true')
  })

  it('uses the label and the hint it is given', () => {
    const { wrapper } = render(false, { label: 'Ativa', hint: 'Inativa some das escolhas.' })

    expect(wrapper.text()).toContain('Ativa')
    expect(wrapper.text()).toContain('Inativa some das escolhas.')
    expect(wrapper.find('button[role="switch"]').attributes('aria-checked')).toBe('false')
  })

  it('writes the switch back to the form', async () => {
    const { wrapper, values } = render(true)

    await wrapper.find('button[role="switch"]').trigger('click')

    expect(values().active).toBe(false)
    expect(wrapper.find('button[role="switch"]').attributes('aria-checked')).toBe('false')

    await wrapper.find('button[role="switch"]').trigger('click')

    expect(values().active).toBe(true)
  })
})
