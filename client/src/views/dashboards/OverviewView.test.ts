import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dashboardsApi } from '@/api/dashboards'
import { Select } from '@/components/ui/select'
import {
  buttonWithText,
  crudTestRoutes,
  problem,
  settle,
  stateOf,
  useCompactViewport,
} from '@/test/crud'
import { createTestPlugins } from '@/test/mounting'
import { overviewExtras } from '@/test/overviewFixtures'
import type { OverviewPeriod, OverviewView as OverviewResponse } from '@/types'
import OverviewView from '@/views/dashboards/OverviewView.vue'

vi.mock('@/api/dashboards')
vi.mock('vue-chartjs', () => ({
  Bar: defineComponent({
    name: 'BarChartStub',
    props: {
      data: { type: Object, default: undefined },
      options: { type: Object, default: undefined },
    },
    setup: () => () => h('canvas'),
  }),
}))

function period(
  id: string,
  endingAt: string,
  revenues: number,
  expenses: number,
  recorded: boolean,
): OverviewPeriod {
  return {
    financialPeriod: { id, name: id, startingAt: `${endingAt.slice(0, 8)}01`, endingAt },
    revenues,
    expenses,
    result: revenues - expenses,
    recorded,
  }
}

const overview: OverviewResponse = {
  cut: '2026',
  years: [2025, 2026],
  totals: {
    revenues: 1800,
    expenses: 700,
    result: 1100,
    savingsRate: 0.6111,
    redPeriods: 0,
    periodsWithMovement: 2,
  },
  resultByYear: [
    {
      year: 2025,
      revenues: 900,
      expenses: 800,
      result: 100,
      savingsRate: 0.1111,
      provisional: false,
    },
    {
      year: 2026,
      revenues: 1800,
      expenses: 700,
      result: 1100,
      savingsRate: 0.6111,
      provisional: true,
    },
  ],
  periods: [
    period('p-9', '2026-09-30', 1000, 400, true),
    period('p-10', '2026-10-31', 800, 300, false),
  ],
  ...overviewExtras,
}

async function render(location = '/dashboards/overview') {
  const { router, plugins } = createTestPlugins({
    routes: [
      { path: '/dashboards/overview', name: 'dashboards.overview', component: OverviewView },
      { path: '/financial/movements', name: 'movements', component: { render: () => h('div') } },
      ...crudTestRoutes('financial-periods'),
      { path: '/classifications', name: 'classifications', component: { render: () => h('div') } },
      {
        path: '/classifications/:id/detail',
        name: 'classifications.detail',
        component: { render: () => h('div') },
      },
    ],
    stubActions: false,
    initialState: {},
  })
  await router.push(location)
  const wrapper = mount(OverviewView, { attachTo: document.body, global: { plugins } })
  await settle()
  return { wrapper, router }
}

describe('OverviewView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
    useCompactViewport(false)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 21))
    vi.mocked(dashboardsApi.findOverview).mockResolvedValue(overview)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('introduces the page, with no description, and loads the current year', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Visão geral')
    expect(wrapper.find('[data-slot="page-description"]').exists()).toBe(false)
    expect(dashboardsApi.findOverview).toHaveBeenCalledWith(2026)
  })

  it('shows the result of the year in five figures, signing nothing that is not negative', async () => {
    const { wrapper } = await render()

    const summary = wrapper.find('[data-slot="summary"]')
    expect(summary.find('h2').text()).toBe('Resultado de 2026')
    const figures = summary.findAll('[data-figure]')
    expect(figures.map((figure) => figure.attributes('data-figure'))).toEqual([
      'revenues',
      'expenses',
      'result',
      'savings-rate',
      'red-periods',
    ])
    expect(figures[0]!.text()).toMatch(/^Receitas\s*R\$\s*1\.800,00$/)
    expect(figures[1]!.text()).toMatch(/^Despesas\s*R\$\s*700,00$/)
    expect(figures[2]!.text()).toMatch(/^Resultado\s*R\$\s*1\.100,00$/)
    expect(figures[3]!.text()).toBe('Taxa de poupança61,1%')
    expect(figures[4]!.text()).toMatch(/^Meses no vermelho0\s+de 2$/)
    expect(summary.text()).not.toMatch(/[+−]/)
    expect(figures[0]!.find('[data-slot="currency"]').classes()).toContain('text-income')
    expect(figures[1]!.find('[data-slot="currency"]').classes()).toContain('text-expense')
    const result = figures[2]!.find('[data-slot="currency"]')
    expect(result.classes()).not.toContain('text-income')
    expect(result.classes()).not.toContain('text-expense')
    expect(figures[3]!.find('.font-mono').classes()).not.toContain('text-expense')
  })

  it('signs the result and the savings rate in red only when they are negative', async () => {
    vi.mocked(dashboardsApi.findOverview).mockResolvedValue({
      ...overview,
      totals: {
        revenues: 300,
        expenses: 700,
        result: -400,
        savingsRate: -1.3333,
        redPeriods: 2,
        periodsWithMovement: 11,
      },
    })
    const { wrapper } = await render()

    const figures = wrapper.find('[data-slot="summary"]').findAll('[data-figure]')
    const result = figures[2]!.find('[data-slot="currency"]')
    expect(result.text()).toMatch(/^−R\$\s*400,00$/)
    expect(result.classes()).toContain('text-expense')
    expect(figures[3]!.text()).toBe('Taxa de poupança−133,3%')
    expect(figures[3]!.find('.font-mono').classes()).toContain('text-expense')
    expect(figures[4]!.text()).toMatch(/^Meses no vermelho2\s+de 11$/)
  })

  it('writes a dash for the savings rate when there are no revenues', async () => {
    vi.mocked(dashboardsApi.findOverview).mockResolvedValue({
      ...overview,
      totals: { ...overview.totals, revenues: 0, result: -700, savingsRate: null },
    })
    const { wrapper } = await render()

    const rate = wrapper.find('[data-figure="savings-rate"]')
    expect(rate.text()).toBe('Taxa de poupança—')
    expect(rate.find('.font-mono').classes()).not.toContain('text-expense')
  })

  it('draws the two charts side by side with the same height, the year one with the selected year', async () => {
    const { wrapper } = await render()

    const [flow, year] = wrapper.findAllComponents({ name: 'BarChartStub' })
    expect(flow!.props('data').datasets[0].data.slice(8, 10)).toEqual([1000, 800])
    expect(year!.props('data').labels).toEqual(['2025', '2026'])
    expect(
      year!
        .props('options')
        .plugins.yearMarks.marks.map((mark: { selected: boolean }) => mark.selected),
    ).toEqual([false, true])
    const charts = wrapper.find('[data-slot="charts"]')
    expect(charts.classes()).toContain('lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]')
    expect(charts.findAll('[role="img"]').map((chart) => chart.classes())).toEqual([
      expect.arrayContaining(['lg:h-64']),
      expect.arrayContaining(['lg:h-64']),
    ])
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual([
      'Resultado de 2026',
      'Reserva e custo de vida',
      'Receitas e despesas por período',
      'Resultado por ano',
      'Confiabilidade',
    ])
  })

  it('puts the reserve between the result and the charts, and the reliability after the table', async () => {
    const { wrapper } = await render()

    const blocks = [...wrapper.find('[data-slot="summary"]').element.parentElement!.children]
    expect(blocks.map((block) => block.getAttribute('data-slot'))).toEqual([
      'summary',
      'reserve',
      'charts',
      'periods',
      'reliability',
    ])
  })

  it('marks the blocks that do not follow the cut as until today only outside the current year', async () => {
    const { wrapper } = await render()
    expect(wrapper.findAll('[data-slot="until-today"]')).toHaveLength(0)
    expect(wrapper.find('[data-slot="reliability"]').text()).not.toContain('Até hoje')

    vi.mocked(dashboardsApi.findOverview).mockResolvedValue({ ...overview, cut: '2025' })
    const past = await render('/dashboards/overview?year=2025')
    expect(past.wrapper.find('[data-slot="reserve"] [data-slot="until-today"]').text()).toBe(
      'até hoje',
    )
    expect(past.wrapper.find('[data-slot="reliability"]').text()).toContain('Até hoje')
    expect(past.wrapper.find('[data-slot="reliability"]').text()).toContain('Ajustes em 2025')

    vi.mocked(dashboardsApi.findOverview).mockResolvedValue({ ...overview, cut: 'all' })
    const everything = await render('/dashboards/overview?year=all')
    expect(
      everything.wrapper.find('[data-slot="reserve"] [data-slot="until-today"]').exists(),
    ).toBe(true)
    expect(everything.wrapper.find('[data-slot="reliability"]').text()).toContain(
      'Ajustes em todos os períodos',
    )
  })

  it('passes the reliability of the server to its card', async () => {
    const { wrapper } = await render()

    const card = wrapper.find('[data-slot="reliability"]')
    expect(card.find('[data-figure="adjustments-total"]').text()).toMatch(/R\$\s*300,00/)
    expect(card.find('[data-slot="reliability-status"]').text()).toBe('Bate com os ajustes')
  })

  it('lists the periods with movement from the newest to the oldest, without a status column', async () => {
    const empty = period('p-12', '2026-12-31', 0, 0, false)
    vi.mocked(dashboardsApi.findOverview).mockResolvedValue({
      ...overview,
      periods: [...overview.periods, empty],
    })
    const { wrapper } = await render()

    expect(wrapper.findAll('th').map((header) => header.text())).toEqual([
      'Período',
      'Receitas (R$)',
      'Despesas (R$)',
      'Resultado (R$)',
    ])
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.findAll('td').map((cell) => cell.text())).toEqual([
      'Out/2026',
      '800,00',
      '300,00',
      'provisório500,00',
    ])
    expect(rows[1]!.findAll('td').map((cell) => cell.text())).toEqual([
      'Set/2026',
      '1.000,00',
      '400,00',
      '600,00',
    ])
    expect(wrapper.find('tbody').text()).not.toMatch(/[+−]/)
    expect(rows[0]!.find('[data-slot="badge"]').text()).toBe('provisório')
    expect(rows[0]!.find('[data-slot="badge"]').classes()).not.toContain('before:size-1.5')
    expect(rows[1]!.find('[data-slot="badge"]').exists()).toBe(false)
    const [revenues, expenses, result] = rows[0]!.findAll('[data-slot="currency"]')
    expect(revenues!.classes()).toContain('text-income')
    expect(expenses!.classes()).toContain('text-expense')
    expect(result!.classes()).not.toContain('text-income')
    expect(result!.classes()).not.toContain('text-expense')
  })

  it('signs a negative period result in red, glued to the value', async () => {
    vi.mocked(dashboardsApi.findOverview).mockResolvedValue({
      ...overview,
      periods: [period('p-9', '2026-09-30', 300, 700, true)],
    })
    const { wrapper } = await render()

    const cell = wrapper.findAll('tbody tr')[0]!.findAll('td')[3]!
    expect(cell.text()).toBe('−400,00')
    expect(cell.find('[data-slot="currency"]').classes()).toContain('text-expense')
  })

  it('shows a period without expenses as a plain zero', async () => {
    vi.mocked(dashboardsApi.findOverview).mockResolvedValue({
      ...overview,
      periods: [period('p-9', '2026-09-30', 1000, 0, true)],
    })
    const { wrapper } = await render()

    expect(wrapper.findAll('tbody tr')[0]!.findAll('td')[2]!.text()).toBe('0,00')
  })

  it('opens the movements of the period from the row, by click and by Enter', async () => {
    const { wrapper, router } = await render()

    await wrapper.findAll('tbody tr')[1]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/financial/movements')
    expect(router.currentRoute.value.query.period).toBe('p-9')

    await router.push('/dashboards/overview')
    await wrapper.findAll('tbody tr')[0]!.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(router.currentRoute.value.query.period).toBe('p-10')
  })

  it('turns the table into one card per period on the phone', async () => {
    useCompactViewport(true)
    const { wrapper, router } = await render()

    expect(wrapper.find('table').exists()).toBe(false)
    const cards = wrapper.findAll('[data-slot="period-card"]')
    expect(cards).toHaveLength(2)
    expect(cards[0]!.text()).toMatch(
      /^Out\/2026\s*provisório500,00\s*Receitas\s*800,00\s*Despesas\s*300,00$/,
    )
    expect(cards[1]!.find('[data-slot="badge"]').exists()).toBe(false)

    await cards[1]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.period).toBe('p-9')

    await router.push('/dashboards/overview')
    await cards[0]!.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(router.currentRoute.value.query.period).toBe('p-10')
  })

  it('offers the years that have periods, newest first, and all the periods', async () => {
    const { wrapper } = await render()

    const trigger = wrapper.find('button[aria-label="Ano"]')
    expect(trigger.text()).toBe('2026')
    await trigger.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    const options = [...document.body.querySelectorAll('[role="option"]')].map((option) =>
      option.textContent?.trim(),
    )
    expect(options).toEqual(['2026', '2025', 'Todos os períodos'])
  })

  it('puts the year in the URL, except the current one, and all the periods as all', async () => {
    const { wrapper, router } = await render()
    const select = wrapper.findComponent(Select)

    select.vm.$emit('update:modelValue', '2025')
    await settle()
    expect(router.currentRoute.value.query.year).toBe('2025')
    expect(dashboardsApi.findOverview).toHaveBeenLastCalledWith(2025)

    select.vm.$emit('update:modelValue', 'all')
    await settle()
    expect(router.currentRoute.value.query.year).toBe('all')
    expect(dashboardsApi.findOverview).toHaveBeenLastCalledWith('all')

    select.vm.$emit('update:modelValue', '2026')
    await settle()
    expect(router.currentRoute.value.query.year).toBeUndefined()
    expect(dashboardsApi.findOverview).toHaveBeenLastCalledWith(2026)
  })

  it('opens on the year of the URL and falls back to the current one when it is not valid', async () => {
    await render('/dashboards/overview?year=2025')
    expect(dashboardsApi.findOverview).toHaveBeenLastCalledWith(2025)

    await render('/dashboards/overview?year=abc')
    expect(dashboardsApi.findOverview).toHaveBeenLastCalledWith(2026)

    await render('/dashboards/overview?year=10000')
    expect(dashboardsApi.findOverview).toHaveBeenLastCalledWith(2026)
  })

  it('shows all the periods: the title, the selected selector and every year marked', async () => {
    vi.mocked(dashboardsApi.findOverview).mockResolvedValue({ ...overview, cut: 'all' })
    const { wrapper } = await render('/dashboards/overview?year=all')

    expect(dashboardsApi.findOverview).toHaveBeenCalledWith('all')
    expect(wrapper.find('[data-slot="summary"] h2').text()).toBe('Resultado de todos os períodos')
    expect(wrapper.find('button[aria-label="Ano"]').text()).toBe('Todos os períodos')
    const [flow, year] = wrapper.findAllComponents({ name: 'BarChartStub' })
    expect(flow!.props('data').labels).toEqual(['set/26', 'out/26'])
    expect(
      year!
        .props('options')
        .plugins.yearMarks.marks.map((mark: { selected: boolean }) => mark.selected),
    ).toEqual([true, true])
  })

  it('goes to the latest year that has periods when the one asked has none', async () => {
    vi.mocked(dashboardsApi.findOverview).mockImplementation(async (cut) => ({
      ...overview,
      cut: String(cut),
      years: [2024, 2025],
    }))
    const { wrapper, router } = await render()

    expect(router.currentRoute.value.query.year).toBe('2025')
    expect(dashboardsApi.findOverview).toHaveBeenNthCalledWith(1, 2026)
    expect(dashboardsApi.findOverview).toHaveBeenLastCalledWith(2025)
    expect(wrapper.find('[data-slot="summary"] h2').text()).toBe('Resultado de 2025')
  })

  it('drops the year from the URL when the latest year with periods is the current one', async () => {
    const { wrapper, router } = await render('/dashboards/overview?year=1999')

    expect(dashboardsApi.findOverview).toHaveBeenNthCalledWith(1, 1999)
    expect(dashboardsApi.findOverview).toHaveBeenLastCalledWith(2026)
    expect(router.currentRoute.value.query.year).toBeUndefined()
    expect(wrapper.find('[data-slot="summary"]').exists()).toBe(true)
  })

  it('hides the screen behind a skeleton while it goes to the latest year', async () => {
    vi.mocked(dashboardsApi.findOverview)
      .mockResolvedValueOnce({ ...overview, years: [2024] })
      .mockReturnValue(new Promise(() => undefined))
    const { wrapper } = await render()

    expect(wrapper.find('[data-slot="loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-slot="summary"]').exists()).toBe(false)
  })

  it('says there are no periods yet, with no selector, and sends to the period form', async () => {
    vi.mocked(dashboardsApi.findOverview).mockResolvedValue({
      cut: '2026',
      years: [],
      totals: {
        revenues: 0,
        expenses: 0,
        result: 0,
        savingsRate: null,
        redPeriods: 0,
        periodsWithMovement: 0,
      },
      resultByYear: [],
      periods: [],
      ...overviewExtras,
    })
    const { wrapper, router } = await render()

    const empty = wrapper.find('[data-state="empty"]')
    expect(empty.find('p').text()).toBe('Nenhum período ainda')
    expect(empty.findAll('p')).toHaveLength(1)
    expect(wrapper.find('button[aria-label="Ano"]').exists()).toBe(false)
    expect(wrapper.find('[data-slot="summary"]').exists()).toBe(false)

    await buttonWithText(wrapper, 'Criar período').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('financial-periods.create')
  })

  it('shows a skeleton while the first load runs, without the selector', async () => {
    vi.mocked(dashboardsApi.findOverview).mockReturnValue(new Promise(() => undefined))
    const { wrapper } = await render()

    expect(wrapper.find('[data-slot="loading"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="Ano"]').exists()).toBe(false)
  })

  it('shows the error with a retry', async () => {
    vi.mocked(dashboardsApi.findOverview).mockRejectedValue(problem(500))
    const { wrapper } = await render()

    expect(stateOf(wrapper)).toBe('error')
    vi.mocked(dashboardsApi.findOverview).mockResolvedValue(overview)
    await buttonWithText(wrapper, 'Tentar de novo').trigger('click')
    await settle()

    expect(stateOf(wrapper)).toBeUndefined()
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })
})
