import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import CardsUsageCard from '@/components/dashboards/CardsUsageCard.vue'
import { useCompactViewport } from '@/test/crud'
import { createTestPlugins } from '@/test/mounting'
import type { PeriodCard } from '@/types'

function card(overrides: Partial<PeriodCard>): PeriodCard {
  return {
    id: 'c-1',
    name: 'Visa Platinum',
    lastFourDigits: '4821',
    invoiceId: 'i-1',
    invoiceStatus: 'OPEN',
    purchases: 125.5,
    history: [
      { financialPeriod: { id: 'p-1', name: 'Outubro' }, purchases: 80 },
      { financialPeriod: { id: 'p-2', name: 'Novembro' }, purchases: 125.5 },
    ],
    ...overrides,
  }
}

const cards = [
  card({}),
  card({ id: 'c-2', name: 'Elo', lastFourDigits: '1111', invoiceStatus: 'CLOSED', purchases: 40 }),
  card({ id: 'c-3', name: 'Master', lastFourDigits: '2222', invoiceStatus: 'PAID', purchases: 10 }),
  card({
    id: 'c-4',
    name: 'Amex',
    lastFourDigits: '3333',
    invoiceId: null,
    invoiceStatus: null,
    purchases: 0,
  }),
]

function render(items: PeriodCard[] = cards) {
  return mount(CardsUsageCard, {
    props: { cards: items },
    global: { plugins: createTestPlugins().plugins },
  })
}

describe('CardsUsageCard', () => {
  beforeEach(() => useCompactViewport(false))

  it('totals the purchases of every card in the header', () => {
    const wrapper = render()

    expect(wrapper.find('h2').text()).toBe('Cartões')
    expect(wrapper.find('[data-slot="cards-total"]').text()).toMatch(/^R\$\s*175,50$/)
    expect(wrapper.findAll('thead th').map((head) => head.text())).toEqual([
      'Cartão',
      'Fatura',
      'Compras (R$)',
      'Últimos 2 períodos',
    ])
  })

  it('writes the singular when the window has one period', () => {
    const wrapper = render([
      card({ history: [{ financialPeriod: { id: 'p-1', name: 'Outubro' }, purchases: 1 }] }),
    ])

    expect(wrapper.findAll('thead th')[3]!.text()).toBe('Últimos 1 período')
  })

  it('shows the card, the status of the invoice and the bars of the window', () => {
    const rows = render().findAll('[data-slot="card-row"]')

    expect(rows).toHaveLength(4)
    expect(rows[0]!.text()).toContain('Visa Platinum')
    expect(rows[0]!.text()).toContain('••4821')
    expect(rows[0]!.text()).toContain('Aberta')
    expect(rows[1]!.text()).toContain('Fechada')
    expect(rows[2]!.text()).toContain('Paga')
    expect(rows[3]!.findAll('td')[1]!.text()).toBe('')
    expect(rows[0]!.findAll('[data-slot="mini-bar"]')).toHaveLength(2)
  })

  it('opens the invoices of the card by click and by Enter', async () => {
    const wrapper = render()
    const rows = wrapper.findAll('[data-slot="card-row"]')

    await rows[0]!.trigger('click')
    await rows[1]!.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('open')!.map(([opened]) => (opened as PeriodCard).id)).toEqual([
      'c-1',
      'c-2',
    ])
  })

  it('turns each card into a row of its own on the phone', async () => {
    useCompactViewport(true)
    const wrapper = render()

    const items = wrapper.findAll('[data-slot="card-item"]')
    expect(items).toHaveLength(4)
    expect(items[0]!.text()).toContain('Aberta')
    expect(items[3]!.text()).not.toContain('Aberta')
    expect(items[0]!.findAll('[data-slot="mini-bar"]')).toHaveLength(2)

    await items[0]!.trigger('click')
    await items[1]!.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('open')).toHaveLength(2)
  })
})
