import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PeriodStatusBadge from '@/components/listing/PeriodStatusBadge.vue'
import i18n from '@/locales'

describe('PeriodStatusBadge', () => {
  it.each([
    ['OPEN', false, 'Aberto'],
    ['OPEN', true, 'Aberto · expirado'],
    ['CLOSED', false, 'Encerrado'],
    ['CLOSED', true, 'Encerrado'],
  ] as const)('shows %s (expired: %s) as %s', (status, expired, text) => {
    const wrapper = mount(PeriodStatusBadge, {
      props: { status, expired },
      global: { plugins: [i18n] },
    })

    expect(wrapper.text()).toBe(text)
  })

  it('treats a missing expired flag as not expired', () => {
    const wrapper = mount(PeriodStatusBadge, {
      props: { status: 'OPEN' },
      global: { plugins: [i18n] },
    })

    expect(wrapper.text()).toBe('Aberto')
  })
})
