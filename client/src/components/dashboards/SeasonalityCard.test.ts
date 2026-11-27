import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import SeasonalityCard from '@/components/dashboards/SeasonalityCard.vue'
import { useCompactViewport } from '@/test/crud'
import { createTestPlugins } from '@/test/mounting'
import type { CompositionView } from '@/types'

const composition: CompositionView = {
  cut: '2026',
  years: [2026],
  expenses: 0,
  revenues: 0,
  costCenters: [],
  classifications: [],
  seasonality: [
    { id: 'c-1', name: 'Mercado', months: [100, 300, ...Array(10).fill(null)] },
    { id: 'c-2', name: 'Luz', months: [50, 50, ...Array(10).fill(null)] },
  ],
  incomeSources: [],
}

function render(average = false) {
  return mount(SeasonalityCard, {
    props: { composition, average, year: '2026' },
    global: { plugins: createTestPlugins().plugins },
  })
}

describe('SeasonalityCard', () => {
  beforeEach(() => useCompactViewport(false))

  it('titles the card and draws the scale from less to more', () => {
    const wrapper = render()

    expect(wrapper.find('h2').text()).toBe('Sazonalidade')
    expect(wrapper.find('[data-slot="scale"]').text()).toMatch(/^Menos\s*Mais$/)
    expect(wrapper.find('[data-slot="scale"]').findAll('span')).toHaveLength(5)
    expect(render(true).find('h2').text()).toBe('Sazonalidade · média por mês')
  })

  it('writes the twelve months, the total of each row and a dash for a month without data', () => {
    const wrapper = render()

    expect(wrapper.findAll('thead th').map((head) => head.text())).toEqual([
      'Classificação',
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
      'Total (R$)',
    ])
    const rows = wrapper.findAll('[data-slot="season-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.find('[data-slot="season-total"]').text()).toBe('400,00')
    expect(rows[0]!.findAll('[data-slot="season-cell"]')).toHaveLength(2)
    expect(rows[0]!.findAll('[data-slot="season-empty"]')).toHaveLength(10)
    expect(rows[0]!.find('[data-slot="season-empty"]').text()).toBe('—')
  })

  it('colors each row relative to its own months, in one tone', () => {
    const [low, high] = render().findAll('[data-slot="season-cell"]')

    expect(low!.attributes('style')).toContain('var(--primary) 8%')
    expect(high!.attributes('style')).toContain('var(--primary) 95%')
  })

  it('puts the value in the tooltip and on the focus of each cell', () => {
    const wrapper = render()
    const cell = wrapper.find('[data-slot="season-cell"]')

    expect(cell.attributes('tabindex')).toBe('0')
    expect(cell.attributes('data-tip')).toMatch(/^Mercado · janeiro de 2026 · R\$\s*100,00$/)
    expect(cell.attributes('aria-label')).toBe(cell.attributes('data-tip'))
    expect(wrapper.find('[data-slot="season-empty"]').attributes('aria-label')).toBe(
      'Mercado · março · —',
    )
  })

  it('writes the average of the month when the cut is all the periods', () => {
    const cell = render(true).find('[data-slot="season-cell"]')

    expect(cell.attributes('data-tip')).toMatch(/^Mercado · média de janeiro · R\$\s*100,00$/)
  })

  it('turns each row into a strip of twelve months on the phone', () => {
    useCompactViewport(true)
    const wrapper = render()

    expect(wrapper.find('[data-slot="season-table"]').exists()).toBe(false)
    expect(
      wrapper
        .find('[data-slot="season-initials"]')
        .findAll('span')
        .map((initial) => initial.text())
        .join(''),
    ).toBe('JFMAMJJASOND')
    const strips = wrapper.findAll('[data-slot="season-strip"]')
    expect(strips).toHaveLength(2)
    expect(strips[0]!.text()).toContain('Mercado')
    expect(strips[0]!.text()).toContain('400,00')
    expect(strips[0]!.findAll('[data-slot="strip-cell"]')).toHaveLength(2)
    expect(strips[0]!.findAll('[data-slot="strip-empty"]')).toHaveLength(10)
    expect(strips[0]!.find('[data-slot="strip-cell"]').attributes('title')).toMatch(
      /^Mercado · janeiro de 2026/,
    )
  })
})
