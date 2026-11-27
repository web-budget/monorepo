import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import BudgetCard from '@/components/dashboards/BudgetCard.vue'
import { useCompactViewport } from '@/test/crud'
import { createTestPlugins } from '@/test/mounting'
import type { PeriodBudgetLine } from '@/types'
import type { BudgetTab } from '@/utils/periodDashboard'

const lines: PeriodBudgetLine[] = [
  {
    costCenter: { id: 'food', name: 'Alimentação', parent: null },
    expense: { budget: 800, used: 900, suggested: 700 },
    income: { budget: null, used: 0, suggested: null },
  },
  {
    costCenter: { id: 'market', name: 'Mercado', parent: 'food' },
    expense: { budget: 400, used: 380, suggested: null },
    income: { budget: null, used: 0, suggested: null },
  },
  {
    costCenter: { id: 'home', name: 'Casa', parent: null },
    expense: { budget: null, used: 150, suggested: null },
    income: { budget: null, used: 0, suggested: null },
  },
  {
    costCenter: { id: 'salary', name: 'Salário', parent: null },
    expense: { budget: null, used: 0, suggested: null },
    income: { budget: 5000, used: 4000, suggested: 4800 },
  },
]

function render(tab: BudgetTab = 'expense', budgetLines = lines) {
  return mount(BudgetCard, {
    props: { lines: budgetLines, tab },
    global: { plugins: createTestPlugins().plugins },
  })
}

describe('BudgetCard', () => {
  beforeEach(() => useCompactViewport(false))

  it('lists the expense tree with the budget, the use, the traffic light and the suggestion', () => {
    const wrapper = render()

    expect(wrapper.find('h2').text()).toBe('Orçamento por centro de custo')
    expect(wrapper.findAll('thead th').map((head) => head.text())).toEqual([
      'Centro de custo',
      'Orçamento (R$)',
      'Uso (R$)',
      'Usado',
      'Sugerido (R$)',
    ])
    const rows = wrapper.findAll('[data-slot="budget-row"]')
    expect(rows).toHaveLength(3)
    expect(rows[0]!.text()).toContain('Alimentação')
    expect(rows[0]!.find('[data-slot="overspent"]').text()).toBe('estourado')
    expect(rows[0]!.find('[data-slot="budget-value"]').text()).toBe('800,00')
    expect(rows[0]!.find('[data-slot="used-value"]').text()).toBe('900,00')
    expect(rows[0]!.find('[data-slot="meter"]').attributes('data-signal')).toBe('over')
    expect(rows[0]!.find('[data-slot="share-value"]').text()).toBe('113%')
    expect(rows[0]!.find('[data-slot="suggested-value"]').text()).toBe('700,00')
    expect(rows[1]!.attributes('data-slot')).toBe('budget-row')
    expect(rows[1]!.find('[data-slot="overspent"]').exists()).toBe(false)
    expect(rows[1]!.find('[data-slot="meter"]').attributes('data-signal')).toBe('warn')
    expect(rows[1]!.find('[data-slot="suggested-value"]').text()).toBe('')
    expect(rows[1]!.find('td span').attributes('style')).toContain('padding-left: 20px')
  })

  it('leaves the budget and the share empty and flags nothing without a budget', () => {
    const rows = render().findAll('[data-slot="budget-row"]')

    expect(rows[2]!.text()).toContain('Casa')
    expect(rows[2]!.find('[data-slot="budget-value"]').text()).toBe('')
    expect(rows[2]!.find('[data-slot="share-value"]').text()).toBe('')
    expect(rows[2]!.find('[data-slot="overspent"]').exists()).toBe(false)
  })

  it('shows the revenue tab with the reached share and never flags it as overspent', () => {
    const wrapper = render('income')

    expect(
      wrapper
        .findAll('thead th')
        .map((head) => head.text())
        .slice(2, 4),
    ).toEqual(['Realizado (R$)', 'Atingido'])
    const rows = wrapper.findAll('[data-slot="budget-row"]')
    expect(rows).toHaveLength(1)
    expect(rows[0]!.find('[data-slot="meter"]').attributes('data-signal')).toBe('warn')
    expect(rows[0]!.find('[data-slot="share-value"]').text()).toBe('80%')
    expect(wrapper.find('[data-slot="overspent"]').exists()).toBe(false)
  })

  it('hides the suggestion column when no line has one and treats a zero budget as none', () => {
    const wrapper = render('expense', [
      {
        costCenter: { id: 'a', name: 'A', parent: null },
        expense: { budget: 0, used: 10, suggested: null },
        income: { budget: null, used: 0, suggested: null },
      },
    ])

    expect(wrapper.findAll('thead th')).toHaveLength(4)
    expect(wrapper.find('[data-slot="budget-value"]').text()).toBe('')
    expect(wrapper.find('[data-slot="overspent"]').exists()).toBe(false)
  })

  it('asks to switch the tab', async () => {
    const wrapper = render()

    const [expense, income] = wrapper.findAll('[role="group"] button')
    expect(expense!.attributes('aria-pressed')).toBe('true')
    expect(income!.attributes('aria-pressed')).toBe('false')

    await income!.trigger('click')

    expect(wrapper.emitted('update:tab')).toEqual([['income']])
  })

  it('turns every cost center into a card on the phone', () => {
    useCompactViewport(true)
    const wrapper = render()

    expect(wrapper.find('[data-slot="budget-table"]').exists()).toBe(false)
    const cards = wrapper.findAll('[data-slot="budget-card"]')
    expect(cards).toHaveLength(3)
    expect(cards[0]!.find('[data-slot="overspent"]').exists()).toBe(true)
    expect(cards[0]!.text()).toContain('113% de 800,00')
    expect(cards[0]!.find('[data-slot="suggested-card"]').text()).toBe('Sugerido 700,00')
    expect(cards[1]!.find('[data-slot="suggested-card"]').exists()).toBe(false)
    expect(cards[2]!.find('[data-slot="meter"]').exists()).toBe(false)
    expect(cards[1]!.find('[data-slot="overspent"]').exists()).toBe(false)
  })
})
