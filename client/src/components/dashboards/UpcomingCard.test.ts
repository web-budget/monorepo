import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import UpcomingCard from '@/components/dashboards/UpcomingCard.vue'
import { useCompactViewport } from '@/test/crud'
import { createTestPlugins } from '@/test/mounting'
import type { PeriodUpcoming, PeriodUpcomingItem } from '@/types'

const today = new Date(2026, 10, 27)

function item(overrides: Partial<PeriodUpcomingItem>): PeriodUpcomingItem {
  return {
    id: 'm-1',
    name: 'Aluguel',
    type: 'EXPENSE',
    value: 1500,
    dueDate: '2026-12-05',
    financialPeriod: { id: 'p-1', name: 'Dezembro de 2026' },
    invoicePayment: false,
    overdue: false,
    ...overrides,
  }
}

const upcoming: PeriodUpcoming = {
  toReceive: 300,
  toPay: 1690,
  items: [
    item({ id: 'late', name: 'Conta de luz', value: 190, dueDate: '2026-11-24', overdue: true }),
    item({ id: 'salary', name: 'Freela', type: 'INCOME', value: 300, dueDate: '2026-11-30' }),
    item({ id: 'invoice', name: 'Fatura Visa', invoicePayment: true }),
  ],
}

function render(data: PeriodUpcoming = upcoming) {
  return mount(UpcomingCard, {
    props: { upcoming: data, today },
    global: { plugins: createTestPlugins().plugins },
  })
}

describe('UpcomingCard', () => {
  beforeEach(() => useCompactViewport(false))

  it('totals what comes in and goes out', () => {
    const wrapper = render()

    expect(wrapper.find('h2').text()).toBe('Próximos 30 dias')
    expect(wrapper.find('[data-slot="to-receive"]').text()).toMatch(/^R\$\s*300,00$/)
    expect(wrapper.find('[data-slot="to-pay"]').text()).toMatch(/^R\$\s*1\.690,00$/)
  })

  it('lists the overdue first with the highlight and how many days late', () => {
    const rows = render().findAll('[data-slot="upcoming-row"]')

    expect(rows).toHaveLength(3)
    expect(rows[0]!.attributes('data-overdue')).toBe('true')
    expect(rows[0]!.classes()).toContain('shadow-[inset_3px_0_0_var(--highlight)]')
    expect(rows[0]!.text()).toContain('24/11')
    expect(rows[0]!.find('[data-slot="overdue"]').text()).toBe('Vencido há 3 dias')
    expect(rows[1]!.text()).toContain('Em aberto')
    expect(rows[1]!.classes()).not.toContain('shadow-[inset_3px_0_0_var(--highlight)]')
    expect(rows[2]!.text()).toContain('fatura')
    expect(rows[2]!.text()).toContain('Dezembro de 2026')
  })

  it('writes one day in the singular', () => {
    const wrapper = render({
      ...upcoming,
      items: [item({ dueDate: '2026-11-26', overdue: true })],
    })

    expect(wrapper.find('[data-slot="overdue"]').text()).toBe('Vencido há 1 dia')
  })

  it('opens the movement by click and by Enter', async () => {
    const wrapper = render()
    const rows = wrapper.findAll('[data-slot="upcoming-row"]')

    await rows[0]!.trigger('click')
    await rows[1]!.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('open')!.map(([opened]) => (opened as PeriodUpcomingItem).id)).toEqual([
      'late',
      'salary',
    ])
  })

  it('says nothing is due when the list is empty', () => {
    const wrapper = render({ toReceive: 0, toPay: 0, items: [] })

    expect(wrapper.find('[data-slot="upcoming-empty"]').text()).toBe(
      'Nada vence nos próximos 30 dias',
    )
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('turns each movement into a card on the phone', async () => {
    useCompactViewport(true)
    const wrapper = render()

    const cards = wrapper.findAll('[data-slot="upcoming-card"]')
    expect(cards).toHaveLength(3)
    expect(cards[0]!.classes()).toContain('shadow-[inset_3px_0_0_var(--highlight)]')
    expect(cards[0]!.find('[data-slot="overdue"]').text()).toBe('Vencido há 3 dias')
    expect(cards[1]!.text()).toContain('Vence em 30/11')
    expect(cards[1]!.text()).toContain('Em aberto')
    expect(cards[2]!.text()).toContain('fatura')
    expect(cards[1]!.classes()).not.toContain('shadow-[inset_3px_0_0_var(--highlight)]')

    await cards[0]!.trigger('click')
    await cards[1]!.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('open')).toHaveLength(2)
  })
})
