import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PurchaseInstallmentBadge from '@/components/invoices/PurchaseInstallmentBadge.vue'
import { createTestPlugins } from '@/test/mounting'
import type { PurchaseRecurringView } from '@/types'

function render(recurringMovement?: PurchaseRecurringView | null, table = false) {
  return mount(PurchaseInstallmentBadge, {
    props: { recurringMovement, table },
    global: { plugins: createTestPlugins().plugins },
  })
}

const installment: PurchaseRecurringView = {
  id: 'r-1',
  name: 'Celular novo',
  installment: 10,
  installments: 12,
}

const openEnded: PurchaseRecurringView = { ...installment, installments: null }

describe('PurchaseInstallmentBadge', () => {
  it('shows the installment with the repeat icon in the table', () => {
    const wrapper = render(installment, true)

    expect(wrapper.text()).toBe('10/12')
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('shows the installment alone in the title', () => {
    const wrapper = render(installment)

    expect(wrapper.text()).toBe('10/12')
    expect(wrapper.find('svg').exists()).toBe(false)
  })

  it('says recurring for an open-ended recurring in the table', () => {
    const wrapper = render(openEnded, true)

    expect(wrapper.text()).toBe('recorrente')
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('shows nothing for an open-ended recurring in the title', () => {
    expect(render(openEnded).find('[data-slot="installment"]').exists()).toBe(false)
  })

  it.each([null, undefined])('shows nothing for a purchase without recurring (%s)', (value) => {
    expect(render(value, true).find('[data-slot="installment"]').exists()).toBe(false)
  })
})
