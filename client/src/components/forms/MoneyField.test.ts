import { mount } from '@vue/test-utils'
import { useForm } from 'vee-validate'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import MoneyField from '@/components/forms/MoneyField.vue'
import i18n from '@/locales'

function render(initial: number | null, props: Record<string, unknown> = {}) {
  let values: () => Record<string, unknown> = () => ({})
  const Host = defineComponent({
    setup() {
      const form = useForm({ initialValues: { amount: initial } })
      values = () => form.values
      return () => h(MoneyField, { name: 'amount', label: 'Meta', ...props })
    },
  })
  const wrapper = mount(Host, { global: { plugins: [i18n] } })
  return { wrapper, values: () => values() }
}

function shown(wrapper: ReturnType<typeof render>['wrapper']) {
  return (wrapper.find('input').element as HTMLInputElement).value
}

describe('MoneyField', () => {
  it('shows the amount next to the R$ addon, or nothing without one', () => {
    expect(shown(render(1500.5).wrapper)).toBe('1.500,50')
    expect(shown(render(null).wrapper)).toBe('')
    expect(render(null).wrapper.find('input').attributes('placeholder')).toBeUndefined()
  })

  it('formats while typing and keeps the number in the form', async () => {
    const { wrapper, values } = render(null)

    await wrapper.find('input').setValue('1')
    expect(shown(wrapper)).toBe('0,01')

    await wrapper.find('input').setValue('1234567')
    expect(shown(wrapper)).toBe('12.345,67')
    expect(values().amount).toBe(12345.67)
  })

  it('keeps typing from the formatted text', async () => {
    const { wrapper, values } = render(12345.67)

    await wrapper.find('input').setValue('12.345,678')

    expect(shown(wrapper)).toBe('123.456,78')
    expect(values().amount).toBe(123456.78)
  })

  it('drops anything that is not a digit', async () => {
    const { wrapper, values } = render(12.34)

    await wrapper.find('input').setValue('12,3a4')

    expect(shown(wrapper)).toBe('12,34')
    expect(values().amount).toBe(12.34)
  })

  it('empties the field and the form value when the text is cleared', async () => {
    const { wrapper, values } = render(12.34)

    await wrapper.find('input').setValue('')

    expect(shown(wrapper)).toBe('')
    expect(values().amount).toBeNull()
  })

  it('marks the group invalid and shows the R$ addon', () => {
    const { wrapper } = render(null)

    expect(wrapper.find('[data-slot="input-group"]').text()).toBe('R$')
    expect(wrapper.find('input').classes()).toContain('text-right')
  })

  it('shows the label, the hint and the disabled state', () => {
    const { wrapper } = render(null, { hint: 'Opcional', disabled: true, required: true })

    expect(wrapper.text()).toContain('Meta')
    expect(wrapper.text()).toContain('Opcional')
    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
  })

  describe('signed', () => {
    it('shows the sign of the amount and the placeholder', () => {
      const { wrapper } = render(-0.02, { signed: true, placeholder: '0,03 ou −0,02' })

      expect(shown(wrapper)).toBe('−0,02')
      expect(wrapper.find('input').attributes('placeholder')).toBe('0,03 ou −0,02')
      expect(shown(render(3.5, { signed: true }).wrapper)).toBe('3,50')
      expect(shown(render(null, { signed: true }).wrapper)).toBe('')
    })

    it('credits by default and debits when the text has a minus sign', async () => {
      const { wrapper, values } = render(null, { signed: true })

      await wrapper.find('input').setValue('3')
      expect(shown(wrapper)).toBe('0,03')
      expect(values().amount).toBe(0.03)

      await wrapper.find('input').setValue('+0,03-')
      expect(shown(wrapper)).toBe('−0,03')
      expect(values().amount).toBe(-0.03)

      await wrapper.find('input').setValue('−0,03+')
      expect(shown(wrapper)).toBe('0,03')
      expect(values().amount).toBe(0.03)
    })

    it('keeps a lone minus sign, as a value that is not a number yet, while the digits come and drops it when cleared', async () => {
      const { wrapper, values } = render(null, { signed: true })

      await wrapper.find('input').setValue('-')
      expect(shown(wrapper)).toBe('−')
      expect(values().amount).toBeNaN()

      await wrapper.find('input').setValue('−')
      expect(shown(wrapper)).toBe('−')

      await wrapper.find('input').setValue('+')
      expect(shown(wrapper)).toBe('')
      expect(values().amount).toBeNull()

      await wrapper.find('input').setValue('-')

      await wrapper.find('input').setValue('−5')
      expect(shown(wrapper)).toBe('−0,05')

      await wrapper.find('input').setValue('')
      expect(shown(wrapper)).toBe('')
      expect(values().amount).toBeNull()
    })
  })
})
