import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { recurringMovementsApi } from '@/api/recurringMovements'
import FilterSelect from '@/components/forms/FilterSelect.vue'
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
import type { FinancialPeriodListView, RecurringMovementView } from '@/types'
import RecurringLaunchView from '@/views/financial/recurring/RecurringLaunchView.vue'

vi.mock('@/api/recurringMovements')
vi.mock('@/api/financialPeriods')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const periods = [
  {
    id: 'p-11',
    name: 'Novembro',
    startingAt: '2026-11-01',
    endingAt: '2026-11-30',
    status: 'OPEN',
    expired: false,
  },
  {
    id: 'p-10',
    name: 'Outubro',
    startingAt: '2026-10-01',
    endingAt: '2026-10-31',
    status: 'OPEN',
    expired: true,
  },
] as FinancialPeriodListView[]

const december = {
  id: 'p-12',
  name: 'Dezembro',
  startingAt: '2026-12-01',
  endingAt: '2026-12-31',
  status: 'OPEN',
  expired: false,
} as FinancialPeriodListView

const rent = {
  id: 'r-1',
  name: 'Aluguel',
  type: 'EXPENSE',
  valueKind: 'FIXED',
  value: 1200,
  suggestedValue: 1200,
  installments: null,
  nextInstallment: 5,
} as RecurringMovementView

const phone = {
  id: 'r-2',
  name: 'Celular novo',
  type: 'EXPENSE',
  valueKind: 'FIXED',
  value: 250,
  suggestedValue: 250,
  installments: 12,
  nextInstallment: 4,
  launchedInPeriod: null,
} as RecurringMovementView

const energy = {
  id: 'r-3',
  name: 'Energia',
  type: 'EXPENSE',
  valueKind: 'VARIABLE',
  value: 180,
  suggestedValue: 210,
  installments: null,
  nextInstallment: 9,
  launchedInPeriod: null,
} as RecurringMovementView

const internet = {
  id: 'r-4',
  name: 'Internet',
  type: 'EXPENSE',
  valueKind: 'FIXED',
  value: 100,
  suggestedValue: 100,
  installments: null,
  nextInstallment: 3,
  autoLaunch: false,
  launchedInPeriod: 'm-9',
} as RecurringMovementView

const salary = {
  id: 'r-5',
  name: 'Salário',
  type: 'INCOME',
  valueKind: 'FIXED',
  value: 5000,
  suggestedValue: 5000,
  autoLaunch: true,
  launchedInPeriod: 'm-10',
} as RecurringMovementView

type Wrapper = Awaited<ReturnType<typeof render>>['wrapper']

async function render(
  location = '/recurring-movements/launch',
  content: RecurringMovementView[] | Error = [rent, phone, energy, internet, salary],
  openPeriods = periods,
) {
  vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf(openPeriods))
  if (content instanceof Error) {
    vi.mocked(recurringMovementsApi.findAll).mockRejectedValue(content)
  } else {
    vi.mocked(recurringMovementsApi.findAll).mockResolvedValue(pageOf(content))
  }
  const { router, plugins } = createTestPlugins({
    routes: [
      ...crudTestRoutes('recurring-movements'),
      {
        path: '/recurring-movements/launch',
        name: 'recurring-movements.launch',
        component: RecurringLaunchView,
      },
      ...crudTestRoutes('movements').filter((route) => route.name !== 'login'),
      ...crudTestRoutes('financial-periods').filter((route) => route.name !== 'login'),
    ],
    stubActions: false,
    initialState: {},
  })
  await router.push(location)
  const wrapper = mount(RecurringLaunchView, { attachTo: document.body, global: { plugins } })
  await flushPromises()
  return { wrapper, router }
}

function checkbox(wrapper: Wrapper, name: string) {
  return wrapper.find(`button[aria-label="Selecionar ${name}"]`)
}

function bar(wrapper: Wrapper) {
  return wrapper.find('[data-slot="launch-bar"]')
}

async function launchCurrent(wrapper: Wrapper, label = 'Lançar 1 recorrente') {
  await buttonWithText(wrapper, label).trigger('click')
  await settle()
}

describe('RecurringLaunchView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 21))
    useCompactViewport(false)
  })

  afterEach(() => {
    vi.useRealTimers()
    useCompactViewport(false)
  })

  it('opens on the open period that holds today, tells when they fall due and keeps it in the URL', async () => {
    const { wrapper, router } = await render()

    expect(wrapper.find('h1').text()).toBe('Lançar recorrentes')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe(
      'Escolha os recorrentes e lance de uma vez.',
    )
    expect(wrapper.find('[data-slot="due-hint"]').text()).toBe('Vencem em 30/11/2026.')
    expect(router.currentRoute.value.query.period).toBe('p-11')
    expect(financialPeriodsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'OPEN' }),
    )
    expect(recurringMovementsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        ended: false,
        financialPeriod: 'p-11',
        sort: 'name,asc',
      }),
    )
  })

  it('opens on the period after the current one when there is one', async () => {
    const { wrapper, router } = await render(
      '/recurring-movements/launch',
      [rent],
      [december, ...periods],
    )

    expect(router.currentRoute.value.query.period).toBe('p-12')
    expect(wrapper.find('[data-slot="due-hint"]').text()).toBe('Vencem em 31/12/2026.')
  })

  it('keeps a period that comes in the URL and falls back when it is not open', async () => {
    const kept = await render('/recurring-movements/launch?period=p-10')
    expect(kept.wrapper.find('[data-slot="due-hint"]').text()).toBe('Vencem em 31/10/2026.')
    expect(kept.router.currentRoute.value.query.period).toBe('p-10')

    const fallen = await render('/recurring-movements/launch?period=nope')
    expect(fallen.router.currentRoute.value.query.period).toBe('p-11')
  })

  it('has the columns of the design, with no sorting', async () => {
    const { wrapper } = await render()

    expect(wrapper.findAll('thead th').map((header) => header.text())).toEqual([
      'Recorrente',
      'Tipo de valor',
      'Valor (R$)',
      'Situação',
    ])
    expect(wrapper.find('thead button').exists()).toBe(false)
  })

  it('shows each recurring movement with its next installment, kind, value and situation', async () => {
    const { wrapper } = await render()

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(5)
    expect(rows[0]!.text()).toContain('Aluguel')
    expect(rows[0]!.text()).not.toContain('5/')
    expect(rows[0]!.text()).toContain('Fixo')
    expect(rows[0]!.text()).toContain('−1.200,00')
    expect(rows[0]!.text()).not.toContain('R$ 1')
    expect(rows[0]!.text()).toContain('Disponível')
    expect(checkbox(wrapper, 'Aluguel').attributes('disabled')).toBeUndefined()
    expect(rows[1]!.text()).toContain('4/12')
    expect(rows[2]!.text()).toContain('Variável')
    expect(
      (rows[2]!.find('input[aria-label="Valor de Energia"]').element as HTMLInputElement).value,
    ).toBe('210,00')
    expect(rows[3]!.text()).toContain('Já lançado')
    expect(rows[3]!.find('input').exists()).toBe(false)
    expect(checkbox(wrapper, 'Internet').attributes('disabled')).toBeDefined()
    expect(rows[4]!.text()).toContain('+5.000,00')
    expect(rows[4]!.text()).toContain('Lançado automaticamente')
    expect(checkbox(wrapper, 'Salário').attributes('disabled')).toBeDefined()
  })

  it('says nothing manual is left when every recurring movement was launched', async () => {
    const { wrapper } = await render('/recurring-movements/launch', [internet, salary])

    expect(wrapper.find('[data-slot="due-hint"]').text()).toBe(
      'Neste período não sobrou nada manual para lançar.',
    )
  })

  it('sums the effect on the period as the selection changes', async () => {
    const { wrapper } = await render()
    expect(bar(wrapper).text()).toContain('Nenhum selecionado')
    expect(buttonWithText(wrapper, 'Lançar recorrentes').attributes('disabled')).toBeDefined()

    await checkbox(wrapper, 'Aluguel').trigger('click')
    expect(bar(wrapper).text()).toContain('1 selecionado · efeito no período −1.200,00')
    expect(buttonWithText(wrapper, 'Lançar 1 recorrente').attributes('disabled')).toBeUndefined()

    await checkbox(wrapper, 'Celular novo').trigger('click')
    await checkbox(wrapper, 'Energia').trigger('click')
    expect(bar(wrapper).text()).toContain('3 selecionados · efeito no período −1.660,00')

    await wrapper.find('input[aria-label="Valor de Energia"]').setValue('15000')
    expect(bar(wrapper).text()).toContain('−1.600,00')

    await checkbox(wrapper, 'Celular novo').trigger('click')
    expect(bar(wrapper).text()).toContain('2 selecionados')
  })

  it('toggles the selection by clicking the row, but never a launched one', async () => {
    const { wrapper } = await render()
    const rows = wrapper.findAll('tbody tr')

    await rows[0]!.trigger('click')
    expect(bar(wrapper).text()).toContain('1 selecionado')

    await rows[0]!.trigger('click')
    expect(bar(wrapper).text()).toContain('Nenhum selecionado')

    await rows[3]!.trigger('click')
    expect(bar(wrapper).text()).toContain('Nenhum selecionado')
  })

  it('does not toggle twice when the checkbox itself is clicked', async () => {
    const { wrapper } = await render()

    await checkbox(wrapper, 'Aluguel').trigger('click')

    expect(bar(wrapper).text()).toContain('1 selecionado')
  })

  it('launches the selection, tells what was created and goes to the movements of the period', async () => {
    const { wrapper, router } = await render()
    vi.mocked(recurringMovementsApi.launch).mockResolvedValue({
      launched: [{}, {}] as never,
      skipped: [],
    })
    await checkbox(wrapper, 'Aluguel').trigger('click')
    await checkbox(wrapper, 'Energia').trigger('click')
    await wrapper.find('input[aria-label="Valor de Energia"]').setValue('15000')

    await launchCurrent(wrapper, 'Lançar 2 recorrentes')

    expect(recurringMovementsApi.launch).toHaveBeenCalledWith('p-11', [
      { id: 'r-1' },
      { id: 'r-3', value: 150 },
    ])
    expect(toast.success).toHaveBeenCalledWith('Recorrentes lançados', {
      description: '2 lançamentos criados em Novembro.',
      duration: 4000,
    })
    expect(toast.warning).not.toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('movements')
    expect(router.currentRoute.value.query.period).toBe('p-11')
  })

  it('warns about the ones the server skipped, with the reason', async () => {
    const { wrapper } = await render()
    vi.mocked(recurringMovementsApi.launch).mockResolvedValue({
      launched: [{}] as never,
      skipped: [
        { recurringMovement: 'r-2', name: 'Celular novo', reason: 'finished' },
        { recurringMovement: 'r-4', name: 'Internet', reason: 'already-launched-in-period' },
      ],
    })
    await checkbox(wrapper, 'Aluguel').trigger('click')

    await launchCurrent(wrapper)

    expect(toast.success).toHaveBeenCalledWith('Recorrentes lançados', {
      description: '1 lançamento criado em Novembro.',
      duration: 4000,
    })
    expect(toast.warning).toHaveBeenCalledWith('Alguns recorrentes não entraram', {
      description: 'Celular novo (encerrado), Internet (já lançado no período)',
      duration: 4000,
    })
  })

  it('shows what the server refuses and keeps the selection', async () => {
    const { wrapper, router } = await render()
    vi.mocked(recurringMovementsApi.launch).mockRejectedValue(
      problem(400, { error: 'inactive-classification' }),
    )
    await checkbox(wrapper, 'Aluguel').trigger('click')

    await launchCurrent(wrapper)

    expect(wrapper.find('[role="alert"]').text()).toContain('A classificação está inativa')
    expect(toast.success).not.toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('recurring-movements.launch')
    expect(bar(wrapper).text()).toContain('1 selecionado')
  })

  it('cancels back to the list and forgets the selection', async () => {
    const { wrapper, router } = await render()
    await checkbox(wrapper, 'Aluguel').trigger('click')

    await buttonWithText(wrapper, 'Cancelar').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('recurring-movements')
    expect(bar(wrapper).text()).toContain('Nenhum selecionado')
  })

  it('reloads for the chosen period and forgets the selection', async () => {
    const { wrapper, router } = await render()
    await checkbox(wrapper, 'Aluguel').trigger('click')

    wrapper.findComponent(FilterSelect).vm.$emit('update:modelValue', 'p-10')
    await settle()

    expect(recurringMovementsApi.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ financialPeriod: 'p-10', page: 0 }),
    )
    expect(router.currentRoute.value.query.period).toBe('p-10')
    expect(wrapper.find('[data-slot="due-hint"]').text()).toBe('Vencem em 31/10/2026.')
    expect(bar(wrapper).text()).toContain('Nenhum selecionado')
  })

  it('goes to another page keeping the selection of the first', async () => {
    const { wrapper } = await render()
    vi.mocked(recurringMovementsApi.findAll).mockResolvedValue(pageOf([rent], 40))
    wrapper.findComponent(FilterSelect).vm.$emit('update:modelValue', 'p-10')
    await settle()
    await checkbox(wrapper, 'Aluguel').trigger('click')
    await wrapper.find('button[aria-label="Próxima página"]').trigger('click')
    await settle()

    expect(recurringMovementsApi.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1 }),
    )
    expect(bar(wrapper).text()).toContain('1 selecionado')
  })

  it('shows the compact list on a phone, with the situation or the kind below the name', async () => {
    useCompactViewport(true)
    const { wrapper } = await render()

    const cards = wrapper.findAll('[data-layout="compact"] > div')
    expect(cards).toHaveLength(5)
    expect(cards[0]!.text()).toContain('Aluguel')
    expect(cards[0]!.text()).toContain('−1.200,00')
    expect(cards[0]!.text()).toContain('Fixo')
    expect(cards[2]!.find('input').exists()).toBe(false)
    expect(cards[2]!.text()).toContain('Variável')
    expect(cards[3]!.text()).toContain('Já lançado')
    expect(cards[4]!.text()).toContain('Lançado automaticamente')

    await cards[0]!.trigger('click')
    expect(bar(wrapper).text()).toContain('1 selecionado')
  })

  it('asks to create a period when none is open', async () => {
    vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf([]))
    vi.mocked(recurringMovementsApi.findAll).mockResolvedValue(pageOf([]))
    const { router, plugins } = createTestPlugins({
      routes: [
        ...crudTestRoutes('recurring-movements'),
        ...crudTestRoutes('financial-periods').filter((route) => route.name !== 'login'),
      ],
      stubActions: false,
      initialState: {},
    })
    await router.push('/recurring-movements')
    const wrapper = mount(RecurringLaunchView, { attachTo: document.body, global: { plugins } })
    await flushPromises()

    expect(wrapper.text()).toContain('Não há período aberto')
    expect(recurringMovementsApi.findAll).not.toHaveBeenCalled()
    expect(stateOf(wrapper)).toBe('empty')

    await buttonWithText(wrapper, 'Criar período').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('financial-periods.create')
  })

  it('shows the empty state when nothing can be launched and the error with a retry', async () => {
    const empty = await render('/recurring-movements/launch', [])
    expect(stateOf(empty.wrapper)).toBe('empty')
    expect(empty.wrapper.text()).not.toContain('Criar')

    const failed = await render('/recurring-movements/launch', problem(500))
    expect(stateOf(failed.wrapper)).toBe('error')
    const calls = vi.mocked(recurringMovementsApi.findAll).mock.calls.length
    await buttonWithText(failed.wrapper, 'Tentar de novo').trigger('click')
    await flushPromises()
    expect(vi.mocked(recurringMovementsApi.findAll).mock.calls.length).toBeGreaterThan(calls)
  })
})
