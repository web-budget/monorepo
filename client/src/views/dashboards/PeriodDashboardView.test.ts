import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dashboardsApi } from '@/api/dashboards'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { Select } from '@/components/ui/select'
import {
  buttonWithText,
  crudTestRoutes,
  pageOf,
  problem,
  settle,
  stateOf,
  useCompactViewport,
} from '@/test/crud'
import { createTestPlugins } from '@/test/mounting'
import type {
  FinancialPeriodListView,
  PeriodDashboardView as PeriodDashboardResponse,
} from '@/types'
import PeriodDashboardView from '@/views/dashboards/PeriodDashboardView.vue'

vi.mock('@/api/dashboards')
vi.mock('@/api/financialPeriods')

function listed(id: string, name: string): FinancialPeriodListView {
  return {
    id,
    name,
    startingAt: '2026-11-01',
    endingAt: '2026-11-30',
    status: 'OPEN',
    expired: false,
    reopenable: false,
  }
}

const periods = [listed('p-nov', 'Novembro de 2026'), listed('p-oct', 'Outubro de 2026')]

const current: PeriodDashboardResponse = {
  period: {
    id: 'p-nov',
    name: 'Novembro de 2026',
    startingAt: '2026-11-01',
    endingAt: '2026-11-30',
    status: 'OPEN',
    current: true,
  },
  goals: {
    revenues: { realized: 8000, goal: 9000 },
    expenses: { realized: 3000, goal: 4500 },
  },
  fixedVsVariable: { fixed: 1000, variable: 2000, fixedShareOfRevenueGoal: 0.1111 },
  budget: [
    {
      costCenter: { id: 'cc-1', name: 'Alimentação', parent: null },
      expense: { budget: 800, used: 300, suggested: null },
      income: { budget: 500, used: 100, suggested: null },
    },
  ],
  upcoming: {
    toReceive: 0,
    toPay: 190,
    items: [
      {
        id: 'm-1',
        name: 'Conta de luz',
        type: 'EXPENSE',
        value: 190,
        dueDate: '2026-11-30',
        financialPeriod: { id: 'p-nov', name: 'Novembro de 2026' },
        invoicePayment: false,
        overdue: false,
      },
    ],
  },
  cards: [
    {
      id: 'card-1',
      name: 'Visa Platinum',
      lastFourDigits: '4821',
      invoiceId: 'inv-1',
      invoiceStatus: 'OPEN',
      purchases: 125.5,
      history: [{ financialPeriod: { id: 'p-nov', name: 'Novembro de 2026' }, purchases: 125.5 }],
    },
  ],
}

const closed: PeriodDashboardResponse = {
  ...current,
  period: {
    ...current.period,
    id: 'p-oct',
    name: 'Outubro de 2026',
    startingAt: '2026-10-01',
    endingAt: '2026-10-31',
    status: 'CLOSED',
    current: false,
  },
  upcoming: null,
  cards: [],
}

async function render(location = '/dashboards/period') {
  const { router, plugins } = createTestPlugins({
    routes: [
      { path: '/dashboards/period', name: 'dashboards.period', component: PeriodDashboardView },
      { path: '/financial/invoices', name: 'invoices', component: { render: () => h('div') } },
      ...crudTestRoutes('financial-periods'),
      ...crudTestRoutes('movements'),
    ],
    stubActions: false,
    initialState: {},
  })
  await router.push(location)
  const wrapper = mount(PeriodDashboardView, { attachTo: document.body, global: { plugins } })
  await settle()
  return { wrapper, router }
}

describe('PeriodDashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
    useCompactViewport(false)
    vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf(periods))
    vi.mocked(dashboardsApi.findPeriod).mockImplementation((id) =>
      Promise.resolve(id === 'p-oct' ? closed : current),
    )
  })

  it('opens on the current period, with its dates and status in the header', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Período')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe('01/11/2026 a 30/11/2026')
    expect(wrapper.find('[data-slot="page-title"]').element.parentElement!.textContent).toContain(
      'Aberto',
    )
    expect(dashboardsApi.findPeriod).toHaveBeenCalledWith(undefined)
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual([
      'Meta × realizado',
      'Orçamento por centro de custo',
      'Próximos 30 dias',
      'Cartões',
    ])
  })

  it('shows the skeleton while loading', async () => {
    vi.mocked(financialPeriodsApi.findAll).mockReturnValue(new Promise(() => undefined))
    const { router, plugins } = createTestPlugins({
      routes: [
        { path: '/dashboards/period', name: 'dashboards.period', component: PeriodDashboardView },
      ],
      stubActions: false,
    })
    await router.push('/dashboards/period')
    const wrapper = mount(PeriodDashboardView, { global: { plugins } })
    await flushPromises()

    expect(wrapper.find('[data-slot="loading"]').exists()).toBe(true)
    expect(wrapper.find('select, [role="combobox"]').exists()).toBe(false)
  })

  it('opens a period from the URL, hides the next 30 days of a past one and omits empty cards', async () => {
    const { wrapper } = await render('/dashboards/period?period=p-oct')

    expect(dashboardsApi.findPeriod).toHaveBeenCalledWith('p-oct')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe('01/10/2026 a 31/10/2026')
    expect(wrapper.find('[data-slot="upcoming"]').exists()).toBe(false)
    expect(wrapper.find('[data-slot="cards"]').exists()).toBe(false)
  })

  it('puts the period in the URL unless it is the current one', async () => {
    const { wrapper, router } = await render()
    const select = wrapper.findComponent(Select)

    select.vm.$emit('update:modelValue', 'p-oct')
    await settle()
    expect(router.currentRoute.value.query.period).toBe('p-oct')
    expect(dashboardsApi.findPeriod).toHaveBeenLastCalledWith('p-oct')
    expect(wrapper.find('[data-slot="upcoming"]').exists()).toBe(false)

    select.vm.$emit('update:modelValue', 'p-nov')
    await settle()
    expect(router.currentRoute.value.query.period).toBeUndefined()
    expect(wrapper.find('[data-slot="upcoming"]').exists()).toBe(true)
    expect(dashboardsApi.findPeriod).toHaveBeenCalledTimes(3)
  })

  it('drops a period from the URL when it turns out to be the current one', async () => {
    const { router } = await render('/dashboards/period?period=p-nov')

    expect(router.currentRoute.value.query.period).toBeUndefined()
    expect(dashboardsApi.findPeriod).toHaveBeenCalledTimes(1)
  })

  it('follows the URL when the link changes with the screen open', async () => {
    const { wrapper, router } = await render()

    await router.replace({ query: { period: 'p-oct' } })
    await settle()

    expect(dashboardsApi.findPeriod).toHaveBeenLastCalledWith('p-oct')
    expect(wrapper.find('[data-slot="upcoming"]').exists()).toBe(false)
  })

  it('keeps the budget tab in the URL, the expense one being the default', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Receita').trigger('click')
    await settle()
    expect(router.currentRoute.value.query.budget).toBe('income')
    expect(wrapper.find('[data-slot="budget"] thead').text()).toContain('Realizado')

    await buttonWithText(wrapper, 'Despesa').trigger('click')
    await settle()
    expect(router.currentRoute.value.query.budget).toBeUndefined()
    expect(dashboardsApi.findPeriod).toHaveBeenCalledTimes(1)
  })

  it('opens the budget on the income tab from the URL', async () => {
    const { wrapper } = await render('/dashboards/period?budget=income')

    expect(wrapper.find('[data-slot="budget"] thead').text()).toContain('Atingido')
  })

  it('leads to the edit of the period, to the movement and to the invoices of the card', async () => {
    vi.mocked(dashboardsApi.findPeriod).mockResolvedValue({
      ...current,
      goals: { ...current.goals, revenues: { realized: 1, goal: null } },
    })
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Editar metas').trigger('click')
    await settle()
    expect(router.currentRoute.value.fullPath).toBe('/financial-periods/p-nov/update')

    await router.push('/dashboards/period')
    await settle()
    await wrapper.find('[data-slot="upcoming-row"]').trigger('click')
    await settle()
    expect(router.currentRoute.value.fullPath).toBe('/movements/m-1/detail')

    await router.push('/dashboards/period')
    await settle()
    await wrapper.find('[data-slot="card-row"]').trigger('click')
    await settle()
    expect(router.currentRoute.value.path).toBe('/financial/invoices')
    expect(router.currentRoute.value.query).toEqual({ period: 'p-nov', card: 'card-1' })
  })

  it('invites to create a period when there is none', async () => {
    vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf([]))
    const { wrapper, router } = await render()

    expect(wrapper.find('[data-state="empty"]').text()).toContain('Nenhum período ainda')
    expect(dashboardsApi.findPeriod).not.toHaveBeenCalled()
    expect(wrapper.find('[role="combobox"]').exists()).toBe(false)

    await buttonWithText(wrapper, 'Criar período').trigger('click')
    await settle()
    expect(router.currentRoute.value.fullPath).toBe('/financial-periods/create')
  })

  it('shows the error with a retry', async () => {
    vi.mocked(dashboardsApi.findPeriod).mockRejectedValue(problem(500))
    const { wrapper } = await render()

    expect(stateOf(wrapper)).toBe('error')
    vi.mocked(dashboardsApi.findPeriod).mockResolvedValue(current)
    await buttonWithText(wrapper, 'Tentar de novo').trigger('click')
    await settle()

    expect(stateOf(wrapper)).toBeUndefined()
    expect(wrapper.find('[data-slot="goals"]').exists()).toBe(true)
  })

  it('loads again when the link changes after a failed load', async () => {
    vi.mocked(dashboardsApi.findPeriod).mockRejectedValue(problem(500))
    const { wrapper, router } = await render()
    expect(stateOf(wrapper)).toBe('error')

    vi.mocked(dashboardsApi.findPeriod).mockResolvedValue(closed)
    await router.replace({ query: { period: 'p-oct' } })
    await settle()

    expect(stateOf(wrapper)).toBeUndefined()
    expect(dashboardsApi.findPeriod).toHaveBeenLastCalledWith('p-oct')
  })
})
