import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
import type { CompositionView as CompositionResponse } from '@/types'
import CompositionView from '@/views/dashboards/CompositionView.vue'

vi.mock('@/api/dashboards')

const composition: CompositionResponse = {
  cut: '2026',
  years: [2025, 2026],
  expenses: 1000,
  revenues: 500,
  costCenters: [
    { id: 'food', name: 'Alimentação', parent: null, value: 600 },
    { id: 'market', name: 'Mercado', parent: 'food', value: 600 },
    { id: 'home', name: 'Casa', parent: null, value: 400 },
  ],
  classifications: [
    { id: 'c-1', name: 'Hortifruti', costCenter: 'market', value: 600 },
    { id: 'c-2', name: 'Aluguel', costCenter: 'home', value: 400 },
  ],
  seasonality: [{ id: 'c-1', name: 'Hortifruti', months: [100, null, ...Array(10).fill(null)] }],
  incomeSources: [{ id: 'i-1', name: 'Salário', value: 500 }],
}

async function render(location = '/dashboards/composition') {
  const { router, plugins } = createTestPlugins({
    routes: [
      {
        path: '/dashboards/composition',
        name: 'dashboards.composition',
        component: CompositionView,
      },
      ...crudTestRoutes('financial-periods'),
    ],
    stubActions: false,
    initialState: {},
  })
  await router.push(location)
  const wrapper = mount(CompositionView, { attachTo: document.body, global: { plugins } })
  await settle()
  return { wrapper, router }
}

describe('CompositionView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
    useCompactViewport(false)
    vi.useRealTimers()
    vi.mocked(dashboardsApi.findComposition).mockResolvedValue(composition)
  })

  it('introduces the page with no description and loads the current year', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 21))
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Composição')
    expect(wrapper.find('[data-slot="page-description"]').exists()).toBe(false)
    expect(dashboardsApi.findComposition).toHaveBeenCalledWith(2026)
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual([
      'Para onde vai (top 10)',
      'Fontes de renda',
      'Sazonalidade',
    ])
  })

  it('shows the seasonality as an average when the cut is all the periods', async () => {
    vi.mocked(dashboardsApi.findComposition).mockResolvedValue({ ...composition, cut: 'all' })
    const { wrapper } = await render('/dashboards/composition?year=all')

    expect(dashboardsApi.findComposition).toHaveBeenCalledWith('all')
    expect(wrapper.findAll('h2')[2]!.text()).toBe('Sazonalidade · média por mês')
  })

  it('leaves the seasonality out when no classification has expenses', async () => {
    vi.mocked(dashboardsApi.findComposition).mockResolvedValue({ ...composition, seasonality: [] })
    const { wrapper } = await render()

    expect(wrapper.find('[data-slot="seasonality"]').exists()).toBe(false)
  })

  it('puts the year in the URL, except the current one, and all the periods as all', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 21))
    const { wrapper, router } = await render()
    const select = wrapper.findComponent(Select)

    select.vm.$emit('update:modelValue', '2025')
    await settle()
    expect(router.currentRoute.value.query.year).toBe('2025')
    expect(dashboardsApi.findComposition).toHaveBeenLastCalledWith(2025)

    select.vm.$emit('update:modelValue', 'all')
    await settle()
    expect(router.currentRoute.value.query.year).toBe('all')

    select.vm.$emit('update:modelValue', '2026')
    await settle()
    expect(router.currentRoute.value.query.year).toBeUndefined()
  })

  it('goes to the latest year with a period when the asked one has none', async () => {
    const { router } = await render('/dashboards/composition?year=2031')

    expect(router.currentRoute.value.query.year).toBe('2026')
    expect(dashboardsApi.findComposition).toHaveBeenLastCalledWith(2026)
  })

  it('writes the tab and the level in the URL and restores them from it', async () => {
    const { wrapper, router } = await render('/dashboards/composition?year=2026')

    await wrapper.find('[data-slot="drill"]').trigger('click')
    await settle()
    expect(router.currentRoute.value.query.costCenter).toBe('food')
    expect(wrapper.find('[data-slot="level-total"]').text()).toContain('600,00')

    await wrapper.findAll('[data-slot="spending"] [role="group"] button')[1]!.trigger('click')
    await settle()
    expect(router.currentRoute.value.query.by).toBe('classification')
    expect(router.currentRoute.value.query.costCenter).toBeUndefined()

    await wrapper.findAll('[data-slot="spending"] [role="group"] button')[0]!.trigger('click')
    await settle()
    expect(router.currentRoute.value.query.by).toBeUndefined()

    await wrapper.find('[data-slot="drill"]').trigger('click')
    await settle()
    await wrapper.find('[data-slot="crumb"]').trigger('click')
    await settle()
    expect(router.currentRoute.value.query.costCenter).toBeUndefined()
  })

  it('opens at the level of the link and ignores a cost center that does not exist', async () => {
    const { wrapper } = await render('/dashboards/composition?year=2026&costCenter=market')

    expect(wrapper.find('[aria-current="page"]').text()).toBe('Mercado')
    expect(
      wrapper.findAll('[data-slot="spending"] [data-slot="rank-name"]').map((name) => name.text()),
    ).toEqual(['Hortifruti'])

    const other = await render('/dashboards/composition?year=2026&costCenter=nope')
    expect(other.wrapper.find('[data-slot="level-total"]').exists()).toBe(false)

    const byClassification = await render(
      '/dashboards/composition?year=2026&by=classification&costCenter=market',
    )
    expect(byClassification.wrapper.find('[data-slot="level-header"]').exists()).toBe(false)
  })

  it('invites to create a period when there is none', async () => {
    vi.mocked(dashboardsApi.findComposition).mockResolvedValue({
      ...composition,
      years: [],
      expenses: 0,
      revenues: 0,
      costCenters: [],
      classifications: [],
      seasonality: [],
      incomeSources: [],
    })
    const { wrapper, router } = await render()

    expect(wrapper.find('[data-state="empty"]').text()).toContain('Nenhum período ainda')
    expect(wrapper.find('[role="combobox"]').exists()).toBe(false)

    await buttonWithText(wrapper, 'Criar período').trigger('click')
    await settle()
    expect(router.currentRoute.value.fullPath).toBe('/financial-periods/create')
  })

  it('shows the error with a retry', async () => {
    vi.mocked(dashboardsApi.findComposition).mockRejectedValue(problem(500))
    const { wrapper } = await render()

    expect(stateOf(wrapper)).toBe('error')
    vi.mocked(dashboardsApi.findComposition).mockResolvedValue(composition)
    await buttonWithText(wrapper, 'Tentar de novo').trigger('click')
    await settle()

    expect(stateOf(wrapper)).toBeUndefined()
    expect(wrapper.find('[data-slot="spending"]').exists()).toBe(true)
  })
})
