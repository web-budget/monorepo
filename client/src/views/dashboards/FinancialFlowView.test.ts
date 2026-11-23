import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dashboardsApi } from '@/api/dashboards'
import { buttonWithText, crudTestRoutes, problem, settle, stateOf } from '@/test/crud'
import { createTestPlugins } from '@/test/mounting'
import type { FinancialFlowView as FlowResponse } from '@/types'
import FinancialFlowView from '@/views/dashboards/FinancialFlowView.vue'

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

const flow: FlowResponse = {
  year: 2026,
  totals: { revenues: 1800, expenses: 700, result: 1100 },
  periods: [
    {
      financialPeriod: {
        id: 'p-9',
        name: 'Setembro',
        startingAt: '2026-09-01',
        endingAt: '2026-09-30',
      },
      revenues: 1000,
      expenses: 400,
      result: 600,
      recorded: true,
    },
    {
      financialPeriod: {
        id: 'p-10',
        name: 'Outubro',
        startingAt: '2026-10-01',
        endingAt: '2026-10-31',
      },
      revenues: 800,
      expenses: 300,
      result: 500,
      recorded: false,
    },
  ],
}

async function render(location = '/dashboards/financial-flow') {
  const { router, plugins } = createTestPlugins({
    routes: [
      {
        path: '/dashboards/financial-flow',
        name: 'dashboards.financial-flow',
        component: FinancialFlowView,
      },
      { path: '/financial/movements', name: 'movements', component: { render: () => h('div') } },
      ...crudTestRoutes('financial-periods'),
    ],
    stubActions: false,
    initialState: {},
  })
  await router.push(location)
  const wrapper = mount(FinancialFlowView, { attachTo: document.body, global: { plugins } })
  await settle()
  return { wrapper, router }
}

describe('FinancialFlowView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 21))
    vi.mocked(dashboardsApi.findFinancialFlow).mockResolvedValue(flow)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('introduces the page and loads the current year', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Fluxo financeiro')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe(
      'Receitas e despesas pagas de cada período.',
    )
    expect(dashboardsApi.findFinancialFlow).toHaveBeenCalledWith(2026)
  })

  it('sums the year in the revenues, expenses and result cards', async () => {
    const { wrapper } = await render()

    const totals = wrapper.find('[data-slot="totals"]').text()
    expect(totals).toMatch(/Receitas\s*\+\s*R\$\s*1\.800,00/)
    expect(totals).toMatch(/Despesas\s*−\s*R\$\s*700,00/)
    expect(totals).toMatch(/Resultado\s*\+\s*R\$\s*1\.100,00/)
  })

  it('gives the chart the periods in chronological order', async () => {
    const { wrapper } = await render()

    const chart = wrapper.findComponent({ name: 'BarChartStub' })
    expect(chart.props('data').datasets[0].data).toEqual([1000, 800])
    expect(wrapper.find('h2').text()).toBe('Receitas e despesas por período')
  })

  it('lists the periods from the newest to the oldest, with result and situation', async () => {
    const { wrapper } = await render()

    expect(wrapper.findAll('th').map((header) => header.text())).toEqual([
      'Período',
      'Receitas (R$)',
      'Despesas (R$)',
      'Resultado (R$)',
      'Situação',
    ])
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('Outubro')
    expect(rows[0]!.text()).toContain('Provisório')
    expect(rows[0]!.text()).toMatch(/\+\s*R\$\s*500,00/)
    expect(rows[1]!.text()).toContain('Setembro')
    expect(rows[1]!.text()).toContain('Gravado')
  })

  it('opens the movements of the period from the row and from the link', async () => {
    const { wrapper, router } = await render()

    await wrapper.findAll('tbody tr')[1]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/financial/movements')
    expect(router.currentRoute.value.query.period).toBe('p-9')

    await router.push('/dashboards/financial-flow')
    await wrapper.findAll('tbody tr')[0]!.find('a').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.period).toBe('p-10')
  })

  it('offers the current year back to 2020 and changes the year in the URL', async () => {
    const { wrapper, router } = await render()
    const select = wrapper.findComponent({ name: 'FilterSelect' })

    const years = (select.props('options') as { value: string }[]).map((option) => option.value)
    expect(years[0]).toBe('2026')
    expect(years[years.length - 1]).toBe('2020')
    expect(years).toHaveLength(7)

    select.vm.$emit('update:modelValue', '2024')
    await settle()
    expect(router.currentRoute.value.query.year).toBe('2024')
    expect(dashboardsApi.findFinancialFlow).toHaveBeenLastCalledWith(2024)

    select.vm.$emit('update:modelValue', '2026')
    await settle()
    expect(router.currentRoute.value.query.year).toBeUndefined()
    expect(dashboardsApi.findFinancialFlow).toHaveBeenLastCalledWith(2026)
  })

  it('opens on the year of the URL and falls back to the current one when it is not valid', async () => {
    await render('/dashboards/financial-flow?year=2023')
    expect(dashboardsApi.findFinancialFlow).toHaveBeenLastCalledWith(2023)

    await render('/dashboards/financial-flow?year=1999')
    expect(dashboardsApi.findFinancialFlow).toHaveBeenLastCalledWith(2026)

    await render('/dashboards/financial-flow?year=abc')
    expect(dashboardsApi.findFinancialFlow).toHaveBeenLastCalledWith(2026)

    await render('/dashboards/financial-flow?year=2027')
    expect(dashboardsApi.findFinancialFlow).toHaveBeenLastCalledWith(2026)
  })

  it('says there are no periods in a year, keeping the totals', async () => {
    vi.mocked(dashboardsApi.findFinancialFlow).mockResolvedValue({
      year: 2024,
      totals: { revenues: 0, expenses: 0, result: 0 },
      periods: [],
    })
    const { wrapper } = await render('/dashboards/financial-flow?year=2024')

    expect(wrapper.find('[data-state="empty"]').text()).toContain('Nenhum período em 2024')
    expect(wrapper.find('[data-slot="totals"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'BarChartStub' }).exists()).toBe(false)
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('shows a skeleton while the first load runs', async () => {
    vi.mocked(dashboardsApi.findFinancialFlow).mockReturnValue(new Promise(() => undefined))
    const { wrapper } = await render()

    expect(wrapper.find('[data-slot="loading"]').exists()).toBe(true)
  })

  it('shows the error with a retry', async () => {
    vi.mocked(dashboardsApi.findFinancialFlow).mockRejectedValue(problem(500))
    const { wrapper } = await render()

    expect(stateOf(wrapper)).toBe('error')
    vi.mocked(dashboardsApi.findFinancialFlow).mockResolvedValue(flow)
    await buttonWithText(wrapper, 'Tentar de novo').trigger('click')
    await settle()

    expect(stateOf(wrapper)).toBeUndefined()
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })
})
