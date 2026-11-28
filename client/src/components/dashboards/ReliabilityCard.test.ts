import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { describe, expect, it } from 'vitest'
import ReliabilityCard from '@/components/dashboards/ReliabilityCard.vue'
import { createTestPlugins } from '@/test/mounting'
import { reliability } from '@/test/overviewFixtures'
import type { OverviewReliability } from '@/types'

async function render(
  overrides: Partial<OverviewReliability> = {},
  props: { cutLabel?: string; untilToday?: boolean } = {},
) {
  const { plugins, router } = createTestPlugins({
    routes: [
      {
        path: '/registration/classifications',
        name: 'classifications',
        component: { render: () => h('div') },
      },
      {
        path: '/registration/classifications/:id/detail',
        name: 'classifications.detail',
        component: { render: () => h('div') },
      },
    ],
  })
  await router.push('/')
  return mount(ReliabilityCard, {
    props: {
      reliability: { ...reliability, ...overrides },
      cutLabel: '2026',
      untilToday: false,
      ...props,
    },
    global: { plugins },
  })
}

describe('ReliabilityCard', () => {
  it('lays eight figures in two rows of four, with the accumulated, the balances and the adjustments', async () => {
    const wrapper = await render()

    expect(wrapper.find('h2').text()).toBe('Confiabilidade')
    expect(wrapper.find('[data-slot="figure-strip"]').classes()).toContain('lg:grid-cols-4')
    const figures = wrapper.findAll('[data-figure]')
    expect(figures.map((figure) => figure.attributes('data-figure'))).toEqual([
      'accumulated',
      'balances-total',
      'difference',
      'adjustments-total',
      'adjustments',
      'credited',
      'debited',
      'generic-weight',
    ])
    expect(figures[0]!.text()).toMatch(/^Acumulado\s*R\$\s*5\.000,00$/)
    expect(figures[1]!.text()).toMatch(/^Soma dos saldos\s*R\$\s*5\.300,00\s*3 carteiras$/)
    expect(figures[2]!.text()).toMatch(/^Diferença\s*R\$\s*300,00$/)
    expect(figures[3]!.text()).toMatch(/^Total dos ajustes\s*R\$\s*300,00$/)
    expect(figures[4]!.text()).toBe('Ajustes em 20262')
    expect(figures[5]!.text()).toMatch(/^Creditado\s*R\$\s*400,00$/)
    expect(figures[6]!.text()).toMatch(/^Debitado\s*R\$\s*100,00$/)
  })

  it('says the reliability matches when there is no residue', async () => {
    const wrapper = await render()

    expect(wrapper.find('[data-slot="reliability-status"]').text()).toBe('Bate com os ajustes')
    expect(wrapper.find('[data-slot="reliability-status"]').classes()).toContain('text-income')
    expect(wrapper.find('[data-slot="residue-alert"]').exists()).toBe(false)
  })

  it('shows the residue in the header and in an alert, signing it only when negative', async () => {
    const positive = await render({ residue: 7 })
    expect(positive.find('[data-slot="reliability-status"]').text()).toMatch(
      /^Resíduo de R\$\s7,00$/,
    )
    expect(positive.find('[data-slot="reliability-status"]').classes()).toEqual(
      expect.arrayContaining(['text-expense', 'before:hidden']),
    )
    const alert = positive.find('[data-slot="residue-alert"]')
    expect(alert.find('[role="alert"]').text()).toMatch(
      /^A diferença não bate com os ajustesResíduo de R\$\s7,00$/,
    )

    const negative = await render({ residue: -12.5 })
    expect(negative.find('[data-slot="reliability-status"]').text()).toMatch(
      /^Resíduo de −R\$\s12,50$/,
    )
    expect(negative.find('[data-slot="residue-alert"]').text()).toMatch(/Resíduo de −R\$\s12,50/)
  })

  it('treats a residue smaller than a cent as matching', async () => {
    const wrapper = await render({ residue: 0.001 })

    expect(wrapper.find('[data-slot="reliability-status"]').text()).toBe('Bate com os ajustes')
  })

  it('signs only the negative values, in red, and colors the credited and the debited by their tone', async () => {
    const wrapper = await render({
      accumulated: -50,
      difference: -10,
      balancesTotal: -1,
      adjustmentsTotal: -2,
    })

    const [accumulated, balances, difference, adjustments] = [
      'accumulated',
      'balances-total',
      'difference',
      'adjustments-total',
    ].map((key) => wrapper.find(`[data-figure="${key}"] [data-slot="currency"]`))
    expect(accumulated!.text()).toMatch(/^−R\$\s*50,00$/)
    expect(balances!.text()).toMatch(/^−R\$\s*1,00$/)
    expect(difference!.text()).toMatch(/^−R\$\s*10,00$/)
    expect(adjustments!.text()).toMatch(/^−R\$\s*2,00$/)
    expect(accumulated!.classes()).toContain('text-expense')
    expect(wrapper.find('[data-figure="credited"] [data-slot="currency"]').classes()).toContain(
      'text-income',
    )
    expect(wrapper.find('[data-figure="debited"] [data-slot="currency"]').classes()).toContain(
      'text-expense',
    )
  })

  it('writes the singular wallet and says until today on the top row outside the current year', async () => {
    const wrapper = await render(
      { walletCount: 1 },
      { untilToday: true, cutLabel: 'todos os períodos' },
    )

    expect(wrapper.find('[data-note="accumulated"]').text()).toBe('Até hoje')
    expect(wrapper.find('[data-note="balances-total"]').text()).toBe('1 carteira · até hoje')
    expect(wrapper.find('[data-note="difference"]').text()).toBe('Até hoje')
    expect(wrapper.find('[data-note="adjustments-total"]').text()).toBe('Até hoje')
    expect(wrapper.find('[data-figure="adjustments"]').text()).toContain(
      'Ajustes em todos os períodos',
    )
    expect(wrapper.find('[data-note="adjustments"]').exists()).toBe(false)
    expect(wrapper.find('[data-note="generic-weight"]').text()).not.toContain('Até hoje')
  })

  it('says there was no adjustment in the cut under the credited figure', async () => {
    const wrapper = await render({ adjustments: { count: 0, credited: 0, debited: 0 } })

    expect(wrapper.find('[data-figure="adjustments"]').text()).toBe('Ajustes em 20260')
    expect(wrapper.find('[data-note="credited"]').text()).toBe('Nenhum ajuste em 2026')
    expect(wrapper.find('[data-figure="debited"]').text()).toMatch(/^Debitado\s*R\$\s*0,00$/)
  })

  it('weighs the generic expenses on the cut and links the marked classifications', async () => {
    const wrapper = await render()

    const figure = wrapper.find('[data-figure="generic-weight"]')
    expect(figure.find('span.font-mono').text()).toBe('15,0%')
    const links = figure.findAll('a')
    expect(links.map((link) => link.text())).toEqual(['Outras despesas', 'Diversos'])
    expect(links.map((link) => link.attributes('href'))).toEqual([
      '/registration/classifications/c-1/detail',
      '/registration/classifications/c-2/detail',
    ])
    expect(wrapper.find('[data-note="generic-weight"]').text()).toMatch(
      /^Outras despesas, Diversos · R\$\s*150,00$/,
    )
  })

  it('shows a dash and links to the classifications when none is marked', async () => {
    const wrapper = await render({
      generic: { value: 0, total: 1000, classifications: [] },
    })

    const figure = wrapper.find('[data-figure="generic-weight"]')
    expect(figure.text()).toBe('Peso da genérica—Nenhuma classificação genérica')
    const link = figure.find('a')
    expect(link.attributes('href')).toBe('/registration/classifications')
    expect(link.classes()).toContain('text-highlight-foreground')
  })

  it('weighs zero when there are no expenses in the cut', async () => {
    const wrapper = await render({
      generic: { value: 0, total: 0, classifications: [{ id: 'c-1', name: 'Outras despesas' }] },
    })

    expect(wrapper.find('[data-figure="generic-weight"] span.font-mono').text()).toBe('0,0%')
  })
})
