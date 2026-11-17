import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, pageOf, problem } from '@/test/crud'
import type { FinancialPeriodListView as FinancialPeriodRow } from '@/types'
import FinancialPeriodListView from '@/views/registration/financial-periods/FinancialPeriodListView.vue'

vi.mock('@/api/financialPeriods')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const periods: FinancialPeriodRow[] = [
  {
    id: 'p-1',
    name: 'January',
    startingAt: '2026-01-01',
    endingAt: '2026-01-31',
    status: 'ACTIVE',
  },
  {
    id: 'p-2',
    name: 'December',
    startingAt: '2025-12-01',
    endingAt: '2025-12-31',
    status: 'ENDED',
  },
  {
    id: 'p-3',
    name: 'November',
    startingAt: '2025-11-01',
    endingAt: '2025-11-30',
    status: 'ACCOUNTED',
  },
]

async function render() {
  vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf(periods))
  return mountView(FinancialPeriodListView, 'financial-periods')
}

describe('FinancialPeriodListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('loads the open periods, newest first, and lists them with status and dates', async () => {
    const { wrapper } = await render()

    expect(financialPeriodsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'OPEN', sort: 'startingAt,desc' }),
    )
    expect(wrapper.findAll('th').map((header) => header.text())).toEqual([
      'Status',
      'Nome',
      'Início',
      'Fim',
      'Ações',
    ])
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(3)
    expect(rows[0]!.text()).toContain('Ativo')
    expect(rows[0]!.text()).toContain('January')
    expect(rows[0]!.text()).toContain('01/01/2026')
    expect(rows[0]!.text()).toContain('31/01/2026')
    expect(rows[1]!.text()).toContain('Encerrado')
    expect(rows[2]!.text()).toContain('Contabilizado')
  })

  it('offers the period status filters and goes back to the open ones on clear', async () => {
    const { wrapper } = await render()

    expect(wrapper.findAll('[role="group"] button').map((button) => button.text())).toEqual([
      'Todos',
      'Contabilizados',
      'Abertos',
    ])

    await buttonWithText(wrapper, 'Contabilizados').trigger('click')
    await flushPromises()
    expect(financialPeriodsApi.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'ACCOUNTED' }),
    )

    await wrapper.find('button[aria-label="Limpar filtro"]').trigger('click')
    await flushPromises()
    expect(financialPeriodsApi.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'OPEN', filter: '' }),
    )
  })

  it('searches by name and sorts by status', async () => {
    const { wrapper } = await render()

    await wrapper.find('input').setValue('Jan')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(financialPeriodsApi.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ filter: 'Jan' }),
    )

    await buttonWithText(wrapper, 'Status').trigger('click')
    await flushPromises()
    expect(financialPeriodsApi.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: 'status,asc' }),
    )
  })

  it('navigates to the form, the detail and the edit form', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Novo').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('financial-periods.create')

    await wrapper.findAll('button[aria-label="Editar"]')[1]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('financial-periods.update')
    expect(router.currentRoute.value.params.id).toBe('p-2')

    await wrapper.findAll('tbody tr')[0]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('financial-periods.detail')
    expect(router.currentRoute.value.params.id).toBe('p-1')
  })

  it('deletes a period after confirmation', async () => {
    const { wrapper } = await render()
    vi.mocked(financialPeriodsApi.remove).mockResolvedValue(undefined)

    await wrapper.findAll('button[aria-label="Deletar"]')[0]!.trigger('click')
    useConfirmDialog().accept()
    await flushPromises()

    expect(financialPeriodsApi.remove).toHaveBeenCalledWith('p-1')
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    expect(toast.success).toHaveBeenCalledWith('Registro excluído', {
      description: 'Período financeiro excluído com sucesso',
      duration: 4000,
    })
  })

  it('keeps the period when the deletion is not confirmed', async () => {
    const { wrapper } = await render()

    await wrapper.findAll('button[aria-label="Deletar"]')[0]!.trigger('click')
    useConfirmDialog().cancel()
    await flushPromises()

    expect(financialPeriodsApi.remove).not.toHaveBeenCalled()
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
  })

  it('shows the server error when the deletion fails', async () => {
    const { wrapper } = await render()
    vi.mocked(financialPeriodsApi.remove).mockRejectedValue(
      problem(400, { error: 'financial-period-not-open' }),
    )

    await wrapper.findAll('button[aria-label="Deletar"]')[2]!.trigger('click')
    useConfirmDialog().accept()
    await flushPromises()

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'O período financeiro não esta aberto',
    )
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
  })
})
