import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SpendingCard from '@/components/dashboards/SpendingCard.vue'
import { createTestPlugins } from '@/test/mounting'
import type { CompositionView } from '@/types'
import type { CompositionBy } from '@/utils/composition'

const composition: CompositionView = {
  cut: '2026',
  years: [2026],
  expenses: 1000,
  revenues: 0,
  costCenters: [
    { id: 'food', name: 'Alimentação', parent: null, value: 600 },
    { id: 'market', name: 'Mercado', parent: 'food', value: 400 },
    { id: 'home', name: 'Casa', parent: null, value: 400 },
  ],
  classifications: [
    { id: 'c-1', name: 'Hortifruti', costCenter: 'market', value: 400 },
    { id: 'c-2', name: 'Aluguel', costCenter: 'home', value: 300 },
    { id: 'c-1', name: 'Hortifruti', costCenter: 'home', value: 100 },
  ],
  seasonality: [],
  incomeSources: [],
}

function render(by: CompositionBy = 'costCenter', node: string | null = null, view = composition) {
  return mount(SpendingCard, {
    props: { composition: view, by, node },
    global: { plugins: createTestPlugins().plugins },
  })
}

describe('SpendingCard', () => {
  it('shows the total of the expenses, the two tabs and the roots with their share', () => {
    const wrapper = render()

    expect(wrapper.find('h2').text()).toBe('Para onde vai (top 10)')
    expect(wrapper.find('[data-slot="spending-total"]').text()).toMatch(/^R\$\s*1\.000,00$/)
    const [costCenter, classification] = wrapper.findAll('[role="group"] button')
    expect(costCenter!.attributes('aria-pressed')).toBe('true')
    expect(classification!.attributes('aria-pressed')).toBe('false')
    expect(wrapper.findAll('[data-slot="rank-row"]').map((row) => row.text())).toEqual([
      expect.stringContaining('Alimentação'),
      expect.stringContaining('Casa'),
    ])
    expect(wrapper.find('[data-slot="level-total"]').exists()).toBe(false)
    expect(wrapper.find('[data-slot="crumb"]').exists()).toBe(false)
  })

  it('asks to switch the tab and to drill into a cost center', async () => {
    const wrapper = render()

    await wrapper.findAll('[role="group"] button')[1]!.trigger('click')
    await wrapper.find('[data-slot="drill"]').trigger('click')

    expect(wrapper.emitted('update:by')).toEqual([['classification']])
    expect(wrapper.emitted('drill')).toEqual([['food']])
  })

  it('shows the path, how much the level is of the total and the children', async () => {
    const wrapper = render('costCenter', 'food')

    expect(wrapper.find('[data-slot="level-total"]').text()).toMatch(/^600,00 · 60,0% do total$/)
    expect(wrapper.find('nav').text()).toBe('TodosAlimentação')
    expect(wrapper.findAll('[data-slot="rank-row"]')).toHaveLength(1)

    await wrapper.find('[data-slot="crumb"]').trigger('click')
    expect(wrapper.emitted('drill')).toEqual([[null]])
  })

  it('lets the path go back to a parent and lists the classifications in the last level', async () => {
    const wrapper = render('costCenter', 'market')

    const crumbs = wrapper.findAll('[data-slot="crumb"]')
    expect(crumbs.map((crumb) => crumb.text())).toEqual(['Todos', 'Alimentação'])
    expect(wrapper.find('[aria-current="page"]').text()).toBe('Mercado')
    expect(wrapper.findAll('[data-slot="rank-name"]').map((name) => name.text())).toEqual([
      'Hortifruti',
    ])
    expect(wrapper.find('[data-slot="drill"]').exists()).toBe(false)

    await crumbs[1]!.trigger('click')
    expect(wrapper.emitted('drill')).toEqual([['food']])
  })

  it('sums each classification over the cost centers in the classification tab', () => {
    const wrapper = render('classification')

    expect(wrapper.find('[data-slot="level-header"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-slot="rank-row"]').map((row) => row.text())).toEqual([
      expect.stringContaining('Hortifruti'),
      expect.stringContaining('Aluguel'),
    ])
    expect(wrapper.find('[data-slot="rank-row"]').text()).toContain('500,00')
  })

  it('folds the rows past the tenth into one muted row with its tooltip', () => {
    const many: CompositionView = {
      ...composition,
      expenses: 1300,
      costCenters: Array.from({ length: 13 }, (_, index) => ({
        id: `cc-${index}`,
        name: `Centro ${index}`,
        parent: null,
        value: 100,
      })),
    }
    const wrapper = render('costCenter', null, many)

    const rows = wrapper.findAll('[data-slot="rank-row"]')
    expect(rows).toHaveLength(11)
    expect(rows[10]!.text()).toContain('Outros 3 centros de custo')
    expect(rows[10]!.attributes('title')).toContain('Centro 10, Centro 11, Centro 12')
  })

  it('folds classifications with their own name', () => {
    const many: CompositionView = {
      ...composition,
      classifications: Array.from({ length: 12 }, (_, index) => ({
        id: `c-${index}`,
        name: `Classe ${index}`,
        costCenter: 'home',
        value: 10,
      })),
    }
    const wrapper = render('classification', null, many)

    expect(wrapper.findAll('[data-slot="rank-row"]')[10]!.text()).toContain(
      'Outras 2 classificações',
    )
  })

  it('says there is no expense when the level is empty', () => {
    const wrapper = render('costCenter', null, { ...composition, expenses: 0, costCenters: [] })

    expect(wrapper.find('[data-slot="spending-empty"]').text()).toBe(
      'Nenhuma despesa neste recorte',
    )
    expect(wrapper.find('[data-slot="ranked-bars"]').exists()).toBe(false)
  })

  it('shows no share when the expenses are zero', () => {
    const wrapper = render('costCenter', 'home', {
      ...composition,
      expenses: 0,
      costCenters: [{ id: 'home', name: 'Casa', parent: null, value: 0 }],
      classifications: [],
    })

    expect(wrapper.find('[data-slot="level-total"]').text()).toContain('0,0%')
  })
})
