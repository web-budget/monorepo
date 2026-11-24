import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import OperationBadge from '@/components/statement/OperationBadge.vue'
import i18n from '@/locales'
import type { WalletEntryOrigin } from '@/types'

function render(origin: WalletEntryOrigin) {
  return mount(OperationBadge, { props: { origin }, global: { plugins: [i18n] } })
}

describe('OperationBadge', () => {
  it.each([
    ['INCOME', 'Receita', 'text-income'],
    ['EXPENSE', 'Despesa', 'text-expense'],
    ['TRANSFER', 'Transferência', 'text-chart-3'],
    ['INVOICE_PAYMENT', 'Pagamento de fatura', 'text-chart-5'],
    ['REVERSAL', 'Estorno', 'text-highlight-foreground'],
    ['ADJUSTMENT', 'Ajuste', 'text-secondary-foreground'],
  ] as const)('shows %s with its name, an icon and its color', (origin, label, color) => {
    const badge = render(origin)

    expect(badge.text()).toBe(label)
    expect(badge.find('svg').exists()).toBe(true)
    expect(badge.classes()).toContain(color)
  })
})
