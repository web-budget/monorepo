import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PeriodStatusBadge from '@/components/listing/PeriodStatusBadge.vue'
import i18n from '@/locales'

describe('PeriodStatusBadge', () => {
  it.each([
    ['ACTIVE', 'Ativo'],
    ['ENDED', 'Encerrado'],
    ['ACCOUNTED', 'Contabilizado'],
  ] as const)('shows %s as %s', (status, text) => {
    const wrapper = mount(PeriodStatusBadge, { props: { status }, global: { plugins: [i18n] } })

    expect(wrapper.text()).toBe(text)
  })
})
