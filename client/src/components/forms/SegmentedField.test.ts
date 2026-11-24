import { mount } from '@vue/test-utils'
import { useForm } from 'vee-validate'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import SegmentedField from '@/components/forms/SegmentedField.vue'
import i18n from '@/locales'

const Icon = defineComponent({ render: () => h('svg', { 'data-icon': 'true' }) })

const options = [
  { value: 'EXPENSE', label: 'Despesa', icon: Icon },
  { value: 'INCOME', label: 'Receita' },
]

function render(props: Record<string, unknown> = {}, initial = 'EXPENSE') {
  let values: () => Record<string, unknown> = () => ({})
  const Host = defineComponent({
    setup() {
      const form = useForm({ initialValues: { type: initial } })
      values = () => form.values
      return () => h(SegmentedField, { name: 'type', options, ...props })
    },
  })
  const wrapper = mount(Host, { global: { plugins: [i18n] } })
  return { wrapper, values: () => values() }
}

describe('SegmentedField', () => {
  it('shows one button per option and marks the one in the form as pressed', () => {
    const { wrapper } = render()

    const buttons = wrapper.findAll('button')
    expect(buttons.map((button) => button.text())).toEqual(['Despesa', 'Receita'])
    expect(buttons.map((button) => button.attributes('aria-pressed'))).toEqual(['true', 'false'])
  })

  it('draws the icon of the options that have one', () => {
    const { wrapper } = render()

    const buttons = wrapper.findAll('button')
    expect(buttons[0]!.find('[data-icon]').exists()).toBe(true)
    expect(buttons[1]!.find('svg').exists()).toBe(false)
  })

  it('writes the chosen option back to the form', async () => {
    const { wrapper, values } = render()

    await wrapper.findAll('button')[1]!.trigger('click')

    expect(values().type).toBe('INCOME')
    expect(wrapper.findAll('button').map((button) => button.attributes('aria-pressed'))).toEqual([
      'false',
      'true',
    ])
  })

  it('uses the name as the accessible name when there is no label', () => {
    const { wrapper } = render()

    expect(wrapper.find('label').exists()).toBe(false)
    expect(wrapper.find('[role="group"]').attributes('aria-label')).toBe('type')
    expect(wrapper.find('[role="group"]').element.parentElement!.className).toContain('grid')
  })

  it('shows the label, with an asterisk when required', () => {
    const { wrapper } = render({ label: 'Tipo', required: true })

    expect(wrapper.find('label').text()).toBe('Tipo*')
    expect(wrapper.find('[role="group"]').attributes('aria-label')).toBe('Tipo')
  })

  it('shows the label without an asterisk when it is not required', () => {
    const { wrapper } = render({ label: 'Tipo' })

    expect(wrapper.find('label').text()).toBe('Tipo')
  })

  it('adds the class it is given to the wrapper', () => {
    const { wrapper } = render({ class: 'md:col-span-2' })

    expect(wrapper.find('[role="group"]').element.parentElement!.className).toContain(
      'md:col-span-2',
    )
  })
})
