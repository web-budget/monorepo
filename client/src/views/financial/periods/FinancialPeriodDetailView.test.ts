import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, problem } from '@/test/crud'
import type { FinancialPeriodView } from '@/types'
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

const result = { revenues: 3000, expenses: 3500, result: -500 }

async function render(view: FinancialPeriodView = period) {
  vi.mocked(financialPeriodsApi.findById).mockResolvedValue(view)
  vi.mocked(financialPeriodsApi.findResult).mockResolvedValue(result)
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
      'Metas',
    ])
    expect(wrapper.text()).toContain('3.000,00')
    expect(wrapper.text()).toMatch(/−\sR\$\s500,00/)
    expect(wrapper.text()).toContain('01/01/2026')
    expect(wrapper.text()).toContain('31/01/2026')
    expect(wrapper.text()).toContain('5.000,00')
    expect(wrapper.text()).toMatch(/R\$\s0,00/)
  })

  it('shows the closed result and offers no edit or removal for a closed period', async () => {
    const { wrapper } = await render({ ...period, status: 'CLOSED' })

    expect(wrapper.find('[data-slot="page-title"]').element.parentElement!.textContent).toContain(
      'Encerrado',
    )
    expect(wrapper.findAll('h2').map((title) => title.text())).toContain('Resultado')
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
