import { mount } from '@vue/test-utils'
import { useForm } from 'vee-validate'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import StatusSection from '@/components/forms/StatusSection.vue'
import i18n from '@/locales'

function render(initial: boolean) {
  let values: () => Record<string, unknown> = () => ({})
  const Host = defineComponent({
    setup() {
      const form = useForm({ initialValues: { active: initial } })
      values = () => form.values
      return () => h(StatusSection, { name: 'active', label: 'Ativa', hint: 'Inativar para sumir' })
    },
  })
  const wrapper = mount(Host, { global: { plugins: [i18n] } })
  return { wrapper, values: () => values() }
}

describe('StatusSection', () => {
  it('shows the title, the help text under it and the labelled switch', () => {
    const { wrapper } = render(true)

    expect(wrapper.find('h2').text()).toBe('Situação')
    expect(wrapper.find('h2').classes()).toContain('text-base')
    expect(wrapper.text()).toContain('Inativar para sumir')
    expect(wrapper.text()).toContain('Ativa')
    expect(wrapper.find('button[role="switch"]').attributes('aria-checked')).toBe('true')
  })

  it('writes the switch back to the form', async () => {
    const { wrapper, values } = render(true)

    await wrapper.find('button[role="switch"]').trigger('click')

    expect(values().active).toBe(false)
    expect(wrapper.find('button[role="switch"]').attributes('aria-checked')).toBe('false')
  })
})
