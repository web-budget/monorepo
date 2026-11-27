import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ImportDestination from '@/components/imports/ImportDestination.vue'
import { createTestPlugins } from '@/test/mounting'

describe('ImportDestination', () => {
  it('shows the card with its last digits', () => {
    const wrapper = mount(ImportDestination, {
      props: {
        source: { target: 'CARD', card: { id: 'c-1', name: 'Visa', lastFourDigits: '4821' } },
      },
      global: { plugins: createTestPlugins().plugins },
    })

    expect(wrapper.text()).toBe('Visa ••4821')
    expect(wrapper.find('svg').classes()).toContain('lucide-credit-card')
  })

  it('shows the wallet', () => {
    const wrapper = mount(ImportDestination, {
      props: { source: { target: 'WALLET', wallet: { id: 'w-1', name: 'Conta corrente' } } },
      global: { plugins: createTestPlugins().plugins },
    })

    expect(wrapper.text()).toBe('Conta corrente')
    expect(wrapper.find('svg').classes()).toContain('lucide-wallet')
  })
})
