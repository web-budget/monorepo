import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import i18n from '@/locales'

function render(props: { value: number | null; zeroIfNull?: boolean }) {
  return mount(CurrencyDisplay, { props, global: { plugins: [i18n] } })
}

describe('CurrencyDisplay', () => {
  it('formats the value as Brazilian currency', () => {
    expect(render({ value: 1234.5 }).text()).toMatch(/^R\$\s*1\.234,50$/)
  })

  it('formats zero', () => {
    expect(render({ value: 0 }).text()).toMatch(/^R\$\s*0,00$/)
  })

  it('renders nothing for a null value', () => {
    expect(render({ value: null }).text()).toBe('')
  })

  it('renders zero for a null value when asked to', () => {
    expect(render({ value: null, zeroIfNull: true }).text()).toMatch(/^R\$\s*0,00$/)
  })
})

describe('CurrencyDisplay signed', () => {
  function renderSigned(value: number | null, zeroIfNull = false) {
    return mount(CurrencyDisplay, {
      props: { value, signed: true, zeroIfNull },
      global: { plugins: [i18n] },
    })
  }

  it('prefixes income with a plus sign and colors it as income', () => {
    const wrapper = renderSigned(2300)

    expect(wrapper.text()).toMatch(/^\+ R\$\s*2\.300,00$/)
    expect(wrapper.classes()).toContain('text-income')
    expect(wrapper.attributes('data-direction')).toBe('income')
  })

  it('prefixes expense with a minus sign and colors it as expense', () => {
    const wrapper = renderSigned(-2300)

    expect(wrapper.text()).toMatch(/^− R\$\s*2\.300,00$/)
    expect(wrapper.classes()).toContain('text-expense')
    expect(wrapper.attributes('data-direction')).toBe('expense')
  })

  it('keeps zero neutral and unsigned', () => {
    const wrapper = renderSigned(0)

    expect(wrapper.text()).toMatch(/^R\$\s*0,00$/)
    expect(wrapper.classes()).not.toContain('text-income')
    expect(wrapper.classes()).not.toContain('text-expense')
    expect(wrapper.attributes('data-direction')).toBeUndefined()
  })

  it('renders nothing for a null value', () => {
    expect(renderSigned(null).text()).toBe('')
  })

  it('renders an unsigned zero for a null value when asked to', () => {
    expect(renderSigned(null, true).text()).toMatch(/^R\$\s*0,00$/)
  })
})

describe('CurrencyDisplay layout', () => {
  it('always uses tabular monospaced digits and no color without signed', () => {
    const wrapper = mount(CurrencyDisplay, {
      props: { value: -50 },
      global: { plugins: [i18n] },
    })

    expect(wrapper.classes()).toEqual(expect.arrayContaining(['font-mono', 'tabular-nums']))
    expect(wrapper.classes()).not.toContain('text-expense')
    expect(wrapper.text()).toContain('50,00')
  })
})

describe('CurrencyDisplay tone', () => {
  function renderTone(tone: 'income' | 'expense', value = 1234) {
    return mount(CurrencyDisplay, { props: { value, tone }, global: { plugins: [i18n] } })
  }

  it('colors as income without adding a sign', () => {
    const wrapper = renderTone('income')

    expect(wrapper.text()).toMatch(/^R\$\s*1\.234,00$/)
    expect(wrapper.classes()).toContain('text-income')
    expect(wrapper.attributes('data-direction')).toBe('income')
  })

  it('colors as expense without adding a sign', () => {
    const wrapper = renderTone('expense')

    expect(wrapper.text()).toMatch(/^R\$\s*1\.234,00$/)
    expect(wrapper.classes()).toContain('text-expense')
  })

  it('lets the sign direction win over the tone', () => {
    const wrapper = mount(CurrencyDisplay, {
      props: { value: -50, signed: true, tone: 'income' },
      global: { plugins: [i18n] },
    })

    expect(wrapper.text()).toMatch(/^− R\$\s*50,00$/)
    expect(wrapper.classes()).toContain('text-expense')
  })

  it('drops the color when neutral', () => {
    const wrapper = mount(CurrencyDisplay, {
      props: { value: 10, tone: 'income', neutral: true },
      global: { plugins: [i18n] },
    })

    expect(wrapper.classes()).not.toContain('text-income')
  })
})
