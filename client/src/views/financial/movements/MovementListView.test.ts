import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { classificationsApi } from '@/api/classifications'
import { costCentersApi } from '@/api/costCenters'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { movementsApi } from '@/api/movements'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import { Switch } from '@/components/ui/switch'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, chooseRowAction, mountView, pageOf, problem } from '@/test/crud'
import type {
  ClassificationListView,
  CostCenterListView,
  FinancialPeriodListView,
  MovementListView,
  MovementQuery,
} from '@/types'
import MovementListViewUnderTest from '@/views/financial/movements/MovementListView.vue'

vi.mock('@/api/movements')
vi.mock('@/api/financialPeriods')
vi.mock('@/api/costCenters')
vi.mock('@/api/classifications')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const november: FinancialPeriodListView = {
  id: 'p-11',
  name: 'Novembro',
  startingAt: '2026-11-01',
  endingAt: '2026-11-30',
  status: 'OPEN',
  expired: false,
}
const october: FinancialPeriodListView = {
  id: 'p-10',
  name: 'Outubro',
  startingAt: '2026-10-01',
  endingAt: '2026-10-31',
  status: 'OPEN',
  expired: true,
}

const costCenters = [{ id: 'cc-1', name: 'Casa', fullName: 'Casa' }] as CostCenterListView[]
const classifications = [
  { id: 'cl-1', name: 'Moradia', type: 'EXPENSE', active: true },
  { id: 'cl-2', name: 'Salário', type: 'INCOME', active: true },
] as ClassificationListView[]

const period = { id: 'p-11', name: 'Novembro', status: 'OPEN', expired: false } as const

const movements: MovementListView[] = [
  {
    id: 'm-1',
    name: 'Conta de água',
    type: 'EXPENSE',
    value: 96.12,
    dueDate: '2026-11-20',
    status: 'OPEN',
    overdue: true,
    financialPeriod: period,
  },
  {
    id: 'm-2',
    name: 'Salário de novembro',
    type: 'INCOME',
    value: 8400,
    dueDate: '2026-11-05',
    status: 'PAID',
    overdue: false,
    financialPeriod: period,
  },
]

const COUNTS: Record<string, number> = { ALL: 2, OPEN: 1, PAID: 1 }

function serve(periods = [november, october], content = movements) {
  vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf(periods))
  vi.mocked(costCentersApi.findAll).mockResolvedValue(pageOf(costCenters))
  vi.mocked(classificationsApi.findAll).mockResolvedValue(pageOf(classifications))
  vi.mocked(financialPeriodsApi.findResult).mockResolvedValue({
    revenues: 8400,
    expenses: 96.12,
    result: 8303.88,
  })
  vi.mocked(movementsApi.findAll).mockImplementation((query: MovementQuery) =>
    Promise.resolve(
      query.size === 1
        ? pageOf([], COUNTS[query.statuses?.[0] ?? 'ALL'])
        : pageOf(content, content.length),
    ),
  )
}

function listing() {
  return vi.mocked(movementsApi.findAll).mock.calls.filter(([query]) => query.size !== 1)
}

async function render(location?: string, periods = [november, october], content = movements) {
  serve(periods, content)
  return mountView(MovementListViewUnderTest, 'movements', {}, {}, location)
}

function select(wrapper: Awaited<ReturnType<typeof render>>['wrapper'], index: number) {
  return wrapper.findAllComponents(FilterSelect)[index]!
}

describe('MovementListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 21))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens on the period that contains today, lists its movements and writes it to the URL', async () => {
    const { wrapper, router } = await render()

    expect(wrapper.find('h1').text()).toBe('Movimentos')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe(
      'Receitas e despesas de Novembro.',
    )
    expect(listing()[0]![0]).toMatchObject({ financialPeriods: ['p-11'], statuses: undefined })
    expect(router.currentRoute.value.query).toEqual({ period: 'p-11' })
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('Conta de água')
    expect(rows[0]!.text()).toContain('20/11/2026')
    expect(rows[0]!.text()).toMatch(/−\sR\$\s96,12/)
    expect(rows[0]!.text()).toContain('Vencido há 1 dia')
    expect(rows[1]!.text()).toMatch(/\+\sR\$\s8\.400,00/)
    expect(rows[1]!.text()).toContain('Pago')
    expect(rows[0]!.attributes('data-state')).toBe('selected')
    expect(rows[1]!.attributes('data-state')).toBeUndefined()
    expect(rows[0]!.find('a').attributes('href')).toBe('/movements/m-1/detail')
  })

  it('shows the received, paid and result of the period', async () => {
    const { wrapper } = await render()

    expect(financialPeriodsApi.findResult).toHaveBeenCalledWith('p-11')
    const summary = wrapper.find('[data-slot="summary"]')
    expect(summary.text()).toContain('Recebido')
    expect(summary.text()).toMatch(/\+\sR\$\s8\.400,00/)
    expect(summary.text()).toMatch(/−\sR\$\s96,12/)
    expect(summary.text()).toMatch(/\+\sR\$\s8\.303,88/)
  })

  it('offers the counts of the tabs and filters by the situation', async () => {
    const { wrapper } = await render()

    expect(wrapper.findAll('[aria-pressed]').map((button) => button.text())).toEqual([
      'Todos 2',
      'Em aberto 1',
      'Pagos 1',
    ])

    await buttonWithText(wrapper, 'Pagos').trigger('click')
    await flushPromises()

    expect(listing().slice(-1)[0]![0]).toMatchObject({ statuses: ['PAID'], page: 0 })
  })

  it('opens with the state of the URL, which stays there', async () => {
    const location =
      '/movements?period=all&type=EXPENSE&costCenter=cc-1&classification=cl-1&overdue=true&status=OPEN&sort=value,asc&filter=agua'

    const { router } = await render(location)

    expect(listing()[0]![0]).toEqual({
      filter: 'agua',
      statuses: ['OPEN'],
      type: 'EXPENSE',
      costCenter: 'cc-1',
      classification: 'cl-1',
      overdue: true,
      financialPeriods: undefined,
      page: 0,
      size: 15,
      sort: 'value,asc',
    })
    expect(router.currentRoute.value.fullPath).toBe(location)
    expect(financialPeriodsApi.findResult).not.toHaveBeenCalled()
  })

  it('ignores an unknown type and a flag that is not true', async () => {
    await render('/movements?period=p-11&type=BOGUS&overdue=maybe')

    expect(listing()[0]![0]).toMatchObject({ type: undefined, overdue: undefined })
  })

  it('describes all periods when none is chosen', async () => {
    const { wrapper } = await render('/movements?period=all')

    expect(wrapper.find('[data-slot="page-description"]').text()).toBe(
      'Receitas e despesas de todos os períodos.',
    )
    expect(wrapper.find('[data-slot="summary"]').exists()).toBe(false)
  })

  it('warns that an expired period still accepts postings', async () => {
    const { wrapper } = await render(undefined, [october])

    expect(wrapper.find('[data-slot="expired-notice"]').text()).toContain(
      'Outubro expirou em 31/10/2026 e continua aberto.',
    )
  })

  it('keeps the list without a default period when there are no periods', async () => {
    const { router } = await render(undefined, [])

    expect(router.currentRoute.value.query).toEqual({})
    expect(listing()[0]![0].financialPeriods).toBeUndefined()
  })

  it('filters by the period, the type, the cost center, the classification and the overdue ones', async () => {
    const { wrapper } = await render()

    select(wrapper, 0).vm.$emit('update:modelValue', 'p-10')
    await flushPromises()
    expect(listing().slice(-1)[0]![0]).toMatchObject({ financialPeriods: ['p-10'] })
    expect(financialPeriodsApi.findResult).toHaveBeenLastCalledWith('p-10')

    select(wrapper, 1).vm.$emit('update:modelValue', 'EXPENSE')
    await flushPromises()
    expect(listing().slice(-1)[0]![0]).toMatchObject({ type: 'EXPENSE', page: 0 })

    select(wrapper, 2).vm.$emit('update:modelValue', 'cc-1')
    await flushPromises()
    expect(listing().slice(-1)[0]![0]).toMatchObject({ costCenter: 'cc-1' })

    select(wrapper, 3).vm.$emit('update:modelValue', 'cl-1')
    await flushPromises()
    expect(listing().slice(-1)[0]![0]).toMatchObject({ classification: 'cl-1' })
    expect(wrapper.text()).toContain('Classificação de despesa')

    wrapper.getComponent(Switch).vm.$emit('update:modelValue', true)
    await flushPromises()
    expect(listing().slice(-1)[0]![0]).toMatchObject({ overdue: true })

    wrapper.getComponent(Switch).vm.$emit('update:modelValue', false)
    await flushPromises()
    expect(listing().slice(-1)[0]![0].overdue).toBeUndefined()
  })

  it('drops a classification that does not belong to the chosen type', async () => {
    const { wrapper } = await render('/movements?period=p-11&type=EXPENSE&classification=cl-1')

    select(wrapper, 1).vm.$emit('update:modelValue', 'INCOME')
    await flushPromises()
    expect(listing().slice(-1)[0]![0]).toMatchObject({ type: 'INCOME', classification: undefined })

    select(wrapper, 1).vm.$emit('update:modelValue', '')
    await flushPromises()
    expect(listing().slice(-1)[0]![0].type).toBeUndefined()
  })

  it('keeps a classification of the chosen type', async () => {
    const { wrapper } = await render('/movements?period=p-11&type=INCOME&classification=cl-2')

    select(wrapper, 1).vm.$emit('update:modelValue', 'INCOME')
    await flushPromises()

    expect(listing().slice(-1)[0]![0]).toMatchObject({ classification: 'cl-2' })
  })

  it('goes back to all periods and clears the filters back to the default period', async () => {
    const { wrapper } = await render()
    const clear = () =>
      wrapper.findAll('button').find((button) => button.text().startsWith('Limpar'))!

    expect(clear().attributes('disabled')).toBeDefined()

    select(wrapper, 0).vm.$emit('update:modelValue', '')
    await flushPromises()
    expect(listing().slice(-1)[0]![0].financialPeriods).toBeUndefined()
    expect(clear().text()).toBe('Limpar (1)')

    select(wrapper, 1).vm.$emit('update:modelValue', 'INCOME')
    await flushPromises()
    expect(clear().text()).toBe('Limpar (2)')

    await clear().trigger('click')
    await flushPromises()
    expect(listing().slice(-1)[0]![0]).toMatchObject({
      financialPeriods: ['p-11'],
      type: undefined,
    })
    expect(clear().attributes('disabled')).toBeDefined()
  })

  it('clears the filters to all periods when there is no default one', async () => {
    const { wrapper } = await render('/movements?period=all&type=INCOME', [])
    const clear = wrapper.findAll('button').find((button) => button.text().startsWith('Limpar'))!

    await clear.trigger('click')
    await flushPromises()

    expect(listing().slice(-1)[0]![0].type).toBeUndefined()
  })

  it('sorts by the value and by the due date', async () => {
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Valor (R$)').trigger('click')
    await flushPromises()
    expect(listing().slice(-1)[0]![0]).toMatchObject({ sort: 'value,asc' })

    await buttonWithText(wrapper, 'Vencimento').trigger('click')
    await flushPromises()
    expect(listing().slice(-1)[0]![0]).toMatchObject({ sort: 'dueDate,asc' })
  })

  it('opens the details from the row menu', async () => {
    const { wrapper, router } = await render()

    await chooseRowAction(wrapper, 0, 'Detalhes')

    expect(router.currentRoute.value.name).toBe('movements.detail')
    expect(router.currentRoute.value.params.id).toBe('m-1')
  })

  it('offers to delete only the open movements', async () => {
    const { wrapper } = await render()

    await wrapper
      .findAll('button[aria-label="Mais ações"]')[1]!
      .trigger('keydown', { key: 'Enter' })
    await flushPromises()

    const items = [...document.body.querySelectorAll('[role="menuitem"]')].map((item) =>
      item.textContent?.trim(),
    )
    expect(items).toEqual(['Detalhes'])
  })

  it('deletes an open movement after confirmation, naming it', async () => {
    vi.mocked(movementsApi.remove).mockResolvedValue(undefined)
    const { wrapper } = await render()
    const dialog = useConfirmDialog()

    await chooseRowAction(wrapper, 0, 'Excluir')
    expect(dialog.state.options.title).toBe('Excluir “Conta de água”?')
    dialog.accept()
    await flushPromises()

    expect(movementsApi.remove).toHaveBeenCalledWith('m-1')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(toast.success).toHaveBeenCalledWith('Movimento excluído', {
      description: '“Conta de água” saiu da lista.',
      duration: 4000,
    })
  })

  it('shows the empty state without offering to create', async () => {
    serve([november], [])
    vi.mocked(movementsApi.findAll).mockImplementation(() => Promise.resolve(pageOf([], 0)))

    const { wrapper } = await mountView(MovementListViewUnderTest, 'movements')

    expect(wrapper.find('[data-state="empty"]').text()).toContain('Nenhum movimento ainda')
    expect(wrapper.find('[data-state="empty"] button').exists()).toBe(false)
  })

  it('says nothing matched the search and clears it', async () => {
    const { wrapper } = await render()
    vi.mocked(movementsApi.findAll).mockImplementation((query: MovementQuery) =>
      Promise.resolve(pageOf([], query.size === 1 ? 2 : 0)),
    )

    await wrapper.find('input').setValue('zzz')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(wrapper.find('[data-state="no-result"]').text()).toContain('zzz')

    await wrapper.find('[data-state="no-result"] button').trigger('click')
    await flushPromises()
    expect(listing().slice(-1)[0]![0].filter).toBeUndefined()
  })

  it('clears the search with the clear button of the field', async () => {
    const { wrapper } = await render()

    await wrapper.find('input').setValue('agua')
    await wrapper.find('button[aria-label="Limpar filtro"]').trigger('click')
    await flushPromises()

    expect(listing().slice(-1)[0]![0].filter).toBeUndefined()
  })

  it('shows the error state when the movements cannot be loaded and retries', async () => {
    serve()
    vi.mocked(movementsApi.findAll).mockRejectedValue(problem(500))

    const { wrapper } = await mountView(MovementListViewUnderTest, 'movements')
    expect(wrapper.find('[data-state="error"]').exists()).toBe(true)

    serve()
    await wrapper.find('[data-state="error"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-state="error"]').exists()).toBe(false)
  })

  it('shows the server error when the options cannot be loaded', async () => {
    serve()
    vi.mocked(financialPeriodsApi.findAll).mockRejectedValue(problem(500))

    const { wrapper } = await mountView(MovementListViewUnderTest, 'movements')

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
  })

  it('shows the server error when the result cannot be loaded', async () => {
    serve()
    vi.mocked(financialPeriodsApi.findResult).mockRejectedValue(problem(500))

    const { wrapper } = await mountView(MovementListViewUnderTest, 'movements')

    expect(wrapper.find('[data-slot="summary"]').exists()).toBe(false)
    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
  })
})
