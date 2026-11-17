import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, problem } from '@/test/crud'
import type { FinancialPeriodView } from '@/types'
import FinancialPeriodDetailView from '@/views/registration/financial-periods/FinancialPeriodDetailView.vue'

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
  status: 'ENDED',
  revenuesGoal: 5000,
  expensesGoal: null,
}

async function render() {
  vi.mocked(financialPeriodsApi.findById).mockResolvedValue(period)
  return mountView(FinancialPeriodDetailView, 'financial-periods', { id: 'p-1' })
}

describe('FinancialPeriodDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the period with status, dates and goals', async () => {
    const { wrapper } = await render()

    expect(financialPeriodsApi.findById).toHaveBeenCalledWith('p-1')
    expect(wrapper.text()).toContain('Detalhando período financeiro')
    expect(wrapper.text()).toContain('Encerrado')
    expect(wrapper.text()).toContain('January')
    expect(wrapper.text()).toContain('01/01/2026')
    expect(wrapper.text()).toContain('31/01/2026')
    expect(wrapper.text()).toContain('5.000,00')
    expect(wrapper.text()).toMatch(/R\$\s0,00/)
  })

  it('goes to the listing and to the edit form', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Editar').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('financial-periods.update')

    await buttonWithText(wrapper, 'Voltar').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('financial-periods')
  })

  it('deletes after confirmation and goes to the listing', async () => {
    const { wrapper, router } = await render()
    vi.mocked(financialPeriodsApi.remove).mockResolvedValue(undefined)

    await buttonWithText(wrapper, 'Excluir').trigger('click')
    useConfirmDialog().accept()
    await flushPromises()

    expect(financialPeriodsApi.remove).toHaveBeenCalledWith('p-1')
    expect(toast.success).toHaveBeenCalledWith('Registro excluído', {
      description: 'Período financeiro excluído com sucesso',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).toBe('financial-periods')
  })

  it('shows the server error when the deletion fails', async () => {
    const { wrapper } = await render()
    vi.mocked(financialPeriodsApi.remove).mockRejectedValue(
      problem(400, { error: 'financial-period-not-open' }),
    )

    await buttonWithText(wrapper, 'Excluir').trigger('click')
    useConfirmDialog().accept()
    await flushPromises()

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'O período financeiro não esta aberto',
    )
  })

  it('shows the server error when the period cannot be loaded', async () => {
    vi.mocked(financialPeriodsApi.findById).mockRejectedValue(problem(404))

    const { wrapper } = await mountView(FinancialPeriodDetailView, 'financial-periods', {
      id: 'x',
    })

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'O recurso solicitado não existe',
    )
  })
})
