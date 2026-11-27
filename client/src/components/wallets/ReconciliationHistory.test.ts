import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { h } from 'vue'
import ItemsTableFooter from '@/components/listing/ItemsTableFooter.vue'
import ReconciliationHistory from '@/components/wallets/ReconciliationHistory.vue'
import { useCompactViewport } from '@/test/crud'
import { createTestPlugins } from '@/test/mounting'
import type { ReconciliationView } from '@/types'

const reconciliations: ReconciliationView[] = [
  {
    id: 'r-2',
    createdOn: '2026-11-20T09:30:00',
    informedBalance: 4812.34,
    walletBalance: 4799.94,
    difference: 12.4,
    reason: 'Rendimento do mês',
    entryId: 'e-2',
  },
  {
    id: 'r-1',
    createdOn: '2026-11-10T18:05:00',
    informedBalance: -20,
    walletBalance: 15,
    difference: -35,
    reason: 'Tarifa que não estava lançada',
    entryId: 'e-1',
  },
]

function render(props: Partial<InstanceType<typeof ReconciliationHistory>['$props']> = {}) {
  const { plugins } = createTestPlugins({
    routes: [
      {
        path: '/statement/:wallet/:id/detail',
        name: 'statement.detail',
        component: { render: () => h('div') },
      },
    ],
  })
  return mount(ReconciliationHistory, {
    props: {
      walletId: 'w-1',
      reconciliations,
      total: reconciliations.length,
      currentPage: 0,
      pageSize: 15,
      selectedId: '',
      loading: false,
      canReconcile: true,
      ...props,
    },
    attachTo: document.body,
    global: { plugins },
  })
}

describe('ReconciliationHistory', () => {
  beforeEach(() => {
    document.body.replaceChildren()
    useCompactViewport(false)
  })

  it('titles the card and lists the reconciliations in a table, without a subtitle', () => {
    const wrapper = render()

    expect(wrapper.find('h2').text()).toBe('Conciliações')
    expect(wrapper.findAll('p')).toHaveLength(0)
    expect(wrapper.findAll('th').map((header) => header.text())).toEqual([
      'Data e hora',
      'Saldo informado',
      'Saldo da carteira',
      'Diferença',
      'Motivo',
      'Ajuste',
    ])
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.findAll('td').map((cell) => cell.text())).toEqual([
      '20/11/2026 09:30',
      '4.812,34',
      '4.799,94',
      '12,40',
      'Rendimento do mês',
      '',
    ])
  })

  it('signs only what is negative and colors the difference by its direction', () => {
    const wrapper = render()

    const [credit, debit] = wrapper.findAll('tbody tr')
    expect(
      credit!.findAll('td')[3]!.find('[data-slot="currency"]').attributes('data-direction'),
    ).toBe('income')
    expect(credit!.text()).not.toMatch(/[+−]/)
    expect(debit!.findAll('td').map((cell) => cell.text())).toContain('−20,00')
    expect(debit!.findAll('td')[2]!.text()).toBe('15,00')
    expect(debit!.findAll('td')[3]!.text()).toBe('−35,00')
    expect(
      debit!.findAll('td')[3]!.find('[data-slot="currency"]').attributes('data-direction'),
    ).toBe('expense')
  })

  it('links each row to its adjustment in the statement', () => {
    const wrapper = render()

    const link = wrapper.find('tbody tr a')
    expect(link.attributes('href')).toBe('/statement/w-1/e-2/detail')
    expect(link.attributes('aria-label')).toBe('Abrir o ajuste no extrato')
  })

  it('gives each row an id to scroll to and marks only the selected one', () => {
    const wrapper = render({ selectedId: 'r-1' })

    const [first, second] = wrapper.findAll('tbody tr')
    expect(first!.attributes('id')).toBe('reconciliation-r-2')
    expect(first!.attributes('data-selected')).toBeUndefined()
    expect(first!.classes()).not.toContain('bg-accent/70')
    expect(second!.attributes('id')).toBe('reconciliation-r-1')
    expect(second!.attributes('data-selected')).toBe('true')
    expect(second!.classes()).toContain('bg-accent/70')
  })

  it('counts the reconciliations in the footer and passes the page to its parent', () => {
    const wrapper = render({ total: 33, currentPage: 1 })

    expect(wrapper.text()).toContain('16–30 de 33 conciliações')
    wrapper.getComponent(ItemsTableFooter).vm.$emit('pageChanged', { currentPage: 0, pageSize: 30 })
    expect(wrapper.emitted('pageChanged')).toEqual([[{ currentPage: 0, pageSize: 30 }]])
  })

  it('says it is one reconciliation in the singular', () => {
    const wrapper = render({ reconciliations: reconciliations.slice(0, 1), total: 1 })

    expect(wrapper.text()).toContain('1–1 de 1 conciliação')
  })

  it('dims the rows while another page loads', () => {
    const wrapper = render({ loading: true })

    expect(wrapper.find('tbody').classes()).toContain('opacity-60')
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('shows a skeleton while the first page loads', () => {
    const wrapper = render({ reconciliations: [], total: 0, loading: true })

    expect(wrapper.find('[aria-label="Carregando..."]').exists()).toBe(true)
    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.find('[data-slot="reconciliation-history-empty"]').exists()).toBe(false)
  })

  describe('with no reconciliation', () => {
    it('shows the empty state with the way to reconcile an active wallet', async () => {
      const wrapper = render({ reconciliations: [], total: 0 })

      const empty = wrapper.find('[data-slot="reconciliation-history-empty"]')
      expect(empty.find('p').text()).toBe('Nenhuma conciliação ainda')
      expect(empty.find('svg').classes()).toContain('lucide-list-checks')
      expect(wrapper.find('table').exists()).toBe(false)
      await empty.find('button').trigger('click')
      expect(empty.find('button').text()).toBe('Conciliar')
      expect(wrapper.emitted('reconcile')).toHaveLength(1)
    })

    it('does not offer to reconcile an inactive wallet', () => {
      const wrapper = render({ reconciliations: [], total: 0, canReconcile: false })

      expect(wrapper.find('[data-slot="reconciliation-history-empty"]').text()).toBe(
        'Nenhuma conciliação ainda',
      )
      expect(wrapper.find('button').exists()).toBe(false)
    })
  })

  describe('on a small screen', () => {
    beforeEach(() => {
      useCompactViewport(true)
    })

    it('turns each reconciliation into a card, with the reason on its own line', () => {
      const wrapper = render()

      expect(wrapper.find('table').exists()).toBe(false)
      const [first, second] = wrapper.findAll('[data-layout="compact"] > div')
      expect(first!.text()).toContain('20/11/2026 09:30')
      expect(first!.text()).toContain('12,40')
      expect(first!.text()).toContain('Rendimento do mês')
      expect(first!.text()).toContain('Informado: 4.812,34')
      expect(first!.text()).toContain('Carteira: 4.799,94')
      expect(first!.find('a').text()).toBe('Ver ajuste')
      expect(first!.find('a').attributes('href')).toBe('/statement/w-1/e-2/detail')
      expect(second!.text()).toContain('−35,00')
      expect(second!.text()).toContain('Informado: −20,00')
      expect(second!.text()).toContain('Carteira: 15,00')
    })

    it('marks the selected card', () => {
      const wrapper = render({ selectedId: 'r-1' })

      const [first, second] = wrapper.findAll('[data-layout="compact"] > div')
      expect(first!.attributes('data-selected')).toBeUndefined()
      expect(second!.attributes('data-selected')).toBe('true')
      expect(second!.attributes('id')).toBe('reconciliation-r-1')
      expect(second!.classes()).toContain('bg-accent/70')
    })
  })
})
