import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, pageOf, problem } from '@/test/crud'
import type { FinancialPeriodListView, FinancialPeriodView } from '@/types'
import FinancialPeriodDetailView from '@/views/financial/periods/FinancialPeriodDetailView.vue'

vi.mock('@/api/financialPeriods')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const period: FinancialPeriodView = {
  id: 'p-1',
  name: 'January',
  startingAt: '2026-01-01',
  endingAt: '2026-01-31',
  status: 'OPEN',
  expired: false,
  revenuesGoal: 5000,
  expensesGoal: null,
}

const lastClosed: FinancialPeriodListView[] = []

const result = { revenues: 3000, expenses: 3500, result: -500, recorded: false }

async function render(view: FinancialPeriodView = period, loaded = result) {
  vi.mocked(financialPeriodsApi.findById).mockResolvedValue(view)
  vi.mocked(financialPeriodsApi.findResult).mockResolvedValue(loaded)
  vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf(lastClosed))
  return mountView(FinancialPeriodDetailView, 'financial-periods', { id: 'p-1' })
}

describe('FinancialPeriodDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the period with its status next to the title, then dates and goals', async () => {
    const { wrapper } = await render()

    expect(financialPeriodsApi.findById).toHaveBeenCalledWith('p-1')
    expect(wrapper.find('h1').text()).toBe('January')
    expect(wrapper.find('[data-slot="page-title"]').element.parentElement!.textContent).toContain(
      'Aberto',
    )
    expect(financialPeriodsApi.findResult).toHaveBeenCalledWith('p-1')
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual([
      'Identificação',
      'Datas',
      'Resultado provisório',
      'Movimentos',
      'Metas',
    ])
    expect(wrapper.text()).toContain('3.000,00')
    expect(wrapper.find('a[href="/financial/movements?period=p-1"]').text()).toBe('Ver movimentos')
    expect(wrapper.text()).toMatch(/−\sR\$\s500,00/)
    expect(wrapper.text()).toContain('01/01/2026')
    expect(wrapper.text()).toContain('31/01/2026')
    expect(wrapper.text()).toContain('5.000,00')
    expect(wrapper.text()).toMatch(/R\$\s0,00/)
  })

  it('shows the closed result and offers no edit or removal for a closed period', async () => {
    const { wrapper } = await render({ ...period, status: 'CLOSED' }, { ...result, recorded: true })

    expect(wrapper.find('[data-slot="page-title"]').element.parentElement!.textContent).toContain(
      'Encerrado',
    )
    expect(wrapper.findAll('h2').map((title) => title.text())).toContain('Resultado gravado')
    expect(wrapper.find('[data-slot="page-actions"]').exists()).toBe(false)
  })

  it('shows the expired mark on an open period past its end', async () => {
    const { wrapper } = await render({ ...period, expired: true })

    expect(wrapper.find('[data-slot="page-title"]').element.parentElement!.textContent).toContain(
      'Aberto · expirado',
    )
  })

  it('shows the server error when the result cannot be loaded', async () => {
    vi.mocked(financialPeriodsApi.findResult).mockRejectedValue(problem(500))
    vi.mocked(financialPeriodsApi.findById).mockResolvedValue(period)
    const { wrapper } = await mountView(FinancialPeriodDetailView, 'financial-periods', {
      id: 'p-1',
    })

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
    expect(wrapper.findAll('h2').map((title) => title.text())).not.toContain('Resultado provisório')
  })

  it('shows no status while the period is loading', async () => {
    vi.mocked(financialPeriodsApi.findById).mockReturnValue(new Promise(() => undefined))

    const { wrapper } = await mountView(FinancialPeriodDetailView, 'financial-periods', {
      id: 'p-1',
    })

    expect(wrapper.find('h1').text()).toBe('Detalhando período financeiro')
    expect(
      wrapper.find('[data-slot="page-title"]').element.parentElement!.textContent,
    ).not.toContain('Encerrado')
  })

  it('goes to the edit form', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Editar').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('financial-periods.update')
  })

  it('asks first, naming the period, then removes it and goes to the listing', async () => {
    const { wrapper, router } = await render()
    vi.mocked(financialPeriodsApi.remove).mockResolvedValue(undefined)
    const dialog = useConfirmDialog()

    await buttonWithText(wrapper, 'Remover').trigger('click')
    expect(dialog.state.options.title).toBe('Remover o período financeiro “January”?')
    dialog.accept()
    await flushPromises()

    expect(financialPeriodsApi.remove).toHaveBeenCalledWith('p-1')
    expect(toast.success).toHaveBeenCalledWith('Período financeiro removido', {
      description: '“January” saiu da lista.',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).toBe('financial-periods')
  })

  it('does nothing when the removal is not confirmed', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Remover').trigger('click')
    useConfirmDialog().cancel()
    await flushPromises()

    expect(financialPeriodsApi.remove).not.toHaveBeenCalled()
    expect(router.currentRoute.value.name).not.toBe('financial-periods')
  })

  it('shows the server error when the removal fails', async () => {
    const { wrapper } = await render()
    vi.mocked(financialPeriodsApi.remove).mockRejectedValue(
      problem(400, { error: 'financial-period-not-open' }),
    )

    await buttonWithText(wrapper, 'Remover').trigger('click')
    useConfirmDialog().accept()
    await flushPromises()

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'O período financeiro não esta aberto',
    )
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('shows the server error when the period cannot be loaded', async () => {
    vi.mocked(financialPeriodsApi.findById).mockRejectedValue(problem(404))

    const { wrapper } = await mountView(FinancialPeriodDetailView, 'financial-periods', {
      id: 'p-9',
    })

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'O recurso solicitado não existe',
    )
  })
})

describe('FinancialPeriodDetailView closing and reopening', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('takes an open period to the closing screen', async () => {
    const { wrapper, router } = await mountClosingTest(period)

    await buttonWithText(wrapper, 'Fechar período').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/financial/closing')
    expect(router.currentRoute.value.query.period).toBe('p-1')
  })

  it('reopens the last closed period after confirmation and reloads the result', async () => {
    const closed = { ...period, status: 'CLOSED' as const }
    const { wrapper } = await mountClosingTest(closed, [{ id: 'p-1' }])
    vi.mocked(financialPeriodsApi.reopen).mockResolvedValue(undefined)
    const dialog = useConfirmDialog()

    await buttonWithText(wrapper, 'Reabrir').trigger('click')
    expect(dialog.state.options.title).toBe('Reabrir January?')
    dialog.accept()
    await flushPromises()

    expect(financialPeriodsApi.reopen).toHaveBeenCalledWith('p-1')
    expect(toast.success).toHaveBeenCalledWith('Período reaberto', {
      description: undefined,
      duration: 4000,
    })
    expect(financialPeriodsApi.findResult).toHaveBeenCalledTimes(2)
  })

  it('offers no reopening for a closed period that is not the last one', async () => {
    const { wrapper } = await mountClosingTest({ ...period, status: 'CLOSED' }, [{ id: 'p-7' }])

    expect(wrapper.find('[data-slot="page-actions"]').exists()).toBe(false)
  })

  it('shows what the server refuses when reopening', async () => {
    const closed = { ...period, status: 'CLOSED' as const }
    const { wrapper } = await mountClosingTest(closed, [{ id: 'p-1' }])
    vi.mocked(financialPeriodsApi.reopen).mockRejectedValue(
      problem(400, { error: 'only-the-last-closed-period-can-be-reopened' }),
    )

    await buttonWithText(wrapper, 'Reabrir').trigger('click')
    useConfirmDialog().accept()
    await flushPromises()

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'Só o último período encerrado reabre',
    )
  })

  it('does not reopen when the confirmation is refused', async () => {
    const closed = { ...period, status: 'CLOSED' as const }
    const { wrapper } = await mountClosingTest(closed, [{ id: 'p-1' }])

    await buttonWithText(wrapper, 'Reabrir').trigger('click')
    useConfirmDialog().cancel()
    await flushPromises()

    expect(financialPeriodsApi.reopen).not.toHaveBeenCalled()
  })
})

async function mountClosingTest(view: FinancialPeriodView, closedPage: { id: string }[] = []) {
  vi.mocked(financialPeriodsApi.findById).mockResolvedValue(view)
  vi.mocked(financialPeriodsApi.findResult).mockResolvedValue(result)
  vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf(closedPage as never[]))
  return mountView(FinancialPeriodDetailView, 'financial-periods', { id: 'p-1' })
}
