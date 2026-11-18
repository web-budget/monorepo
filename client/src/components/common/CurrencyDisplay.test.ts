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
