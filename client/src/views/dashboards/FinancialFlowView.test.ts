import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dashboardsApi } from '@/api/dashboards'
import { buttonWithText, crudTestRoutes, problem, settle, stateOf } from '@/test/crud'
import { createTestPlugins } from '@/test/mounting'
import type { FinancialFlowView as FlowResponse } from '@/types'
import { Select } from '@/components/ui/select'
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

  it('shows the year in the revenues, expenses and result cards, without signs', async () => {
    const { wrapper } = await render()

    const totals = wrapper.find('[data-slot="totals"]')
    expect(totals.text()).toMatch(/Receitas\s*R\$\s*1\.800,00/)
    expect(totals.text()).toMatch(/Despesas\s*R\$\s*700,00/)
    expect(totals.text()).toMatch(/Resultado\s*R\$\s*1\.100,00/)
    expect(totals.text()).not.toMatch(/[+−]/)
    const [revenues, expenses, result] = totals.findAll('[data-slot="currency"]')
    expect(revenues!.classes()).toContain('text-income')
    expect(expenses!.classes()).toContain('text-expense')
    expect(result!.classes()).not.toContain('text-income')
    expect(result!.classes()).not.toContain('text-expense')
  })

  it('gives the chart the periods of the year', async () => {
    const { wrapper } = await render()

    const chart = wrapper.findComponent({ name: 'BarChartStub' })
    expect(chart.props('data').datasets[0].data.slice(8, 10)).toEqual([1000, 800])
    expect(wrapper.find('h2').text()).toBe('Receitas e despesas por período')
  })

  it('lists the periods with movement from the newest to the oldest, without the empty ones', async () => {
    const empty = {
      financialPeriod: {
        id: 'p-12',
        name: 'Dezembro',
        startingAt: '2026-12-01',
        endingAt: '2026-12-31',
      },
      revenues: 0,
      expenses: 0,
      result: 0,
      recorded: false,
    }
    vi.mocked(dashboardsApi.findFinancialFlow).mockResolvedValue({
      ...flow,
      periods: [...flow.periods, empty],
    })
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
    expect(rows[0]!.findAll('td').map((cell) => cell.text())).toEqual([
      'Out/2026',
      '800,00',
      '300,00',
      '500,00',
      'Provisório',
    ])
    expect(rows[1]!.findAll('td').map((cell) => cell.text())).toEqual([
      'Set/2026',
      '1.000,00',
      '400,00',
      '600,00',
      'Gravado',
    ])
    expect(wrapper.find('tbody').text()).not.toMatch(/[+−]/)
    const [revenues, expenses, result] = rows[0]!.findAll('[data-slot="currency"]')
    expect(revenues!.classes()).toContain('text-income')
    expect(expenses!.classes()).toContain('text-expense')
    expect(result!.classes()).not.toContain('text-income')
    expect(result!.classes()).not.toContain('text-expense')
    expect(rows[0]!.find('[data-slot="badge"]').classes()).not.toContain('before:size-1.5')
  })

  it('signs the result only when it is negative, in red, in the table and in the card', async () => {
    vi.mocked(dashboardsApi.findFinancialFlow).mockResolvedValue({
      ...flow,
      totals: { revenues: 300, expenses: 700, result: -400 },
      periods: [{ ...flow.periods[0]!, revenues: 300, expenses: 700, result: -400 }],
    })
    const { wrapper } = await render()

    const card = wrapper.find('[data-slot="totals"]').findAll('[data-slot="currency"]')[2]!
    expect(card.text()).toMatch(/^−\s+R\$\s*400,00$/)
    expect(card.classes()).toContain('text-expense')
    const cell = wrapper.findAll('tbody tr')[0]!.findAll('td')[3]!
    expect(cell.text()).toBe('−400,00')
    expect(cell.find('[data-slot="currency"]').classes()).toContain('text-expense')
  })

  it('shows a period without expenses as a plain zero', async () => {
    vi.mocked(dashboardsApi.findFinancialFlow).mockResolvedValue({
      ...flow,
      periods: [{ ...flow.periods[0]!, expenses: 0, result: 1000 }],
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

    await router.push('/dashboards/financial-flow')
    await wrapper.findAll('tbody tr')[0]!.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(router.currentRoute.value.query.period).toBe('p-10')
  })

  it('offers the current year back to 2020 and changes the year in the URL', async () => {
    const { wrapper, router } = await render()

    const trigger = wrapper.find('button[aria-label="Ano"]')
    expect(trigger.text()).toBe('2026')
    await trigger.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    const years = [...document.body.querySelectorAll('[role="option"]')].map((option) =>
      option.textContent?.trim(),
    )
    expect(years).toEqual(['2026', '2025', '2024', '2023', '2022', '2021', '2020'])

    const select = wrapper.findComponent(Select)
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

  it('says there are no periods when the ones of the year have no movement', async () => {
    vi.mocked(dashboardsApi.findFinancialFlow).mockResolvedValue({
      year: 2026,
      totals: { revenues: 0, expenses: 0, result: 0 },
      periods: [{ ...flow.periods[1]!, revenues: 0, expenses: 0, result: 0 }],
    })
    const { wrapper } = await render()

    expect(wrapper.find('[data-state="empty"]').exists()).toBe(true)
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
