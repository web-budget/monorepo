import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import {
  buttonWithText,
  chooseRowAction,
  listingCalls,
  mountView,
  problem,
  serveListing,
  stateOf,
} from '@/test/crud'
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

const COUNTS = { OPEN: 2, ACCOUNTED: 1, ALL: 3 }

async function render(content = periods, counts: Record<string, number> = COUNTS) {
  serveListing(vi.mocked(financialPeriodsApi.findAll), content, content.length, counts)
  return mountView(FinancialPeriodListView, 'financial-periods')
}

describe('FinancialPeriodListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('introduces the page and offers the open periods first, with the counts', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Períodos financeiros')
    expect(wrapper.find('[data-slot="page-actions"]').text()).toBe('Novo período financeiro')
    expect(wrapper.findAll('[aria-pressed]').map((button) => button.text())).toEqual([
      'Abertos 2',
      'Contabilizados 1',
      'Todos 3',
    ])
    expect(buttonWithText(wrapper, 'Abertos').attributes('aria-pressed')).toBe('true')
  })

  it('loads the open periods, newest first, and lists them with dates and status', async () => {
    const { wrapper } = await render()

    expect(financialPeriodsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'OPEN', sort: 'startingAt,desc' }),
    )
    expect(wrapper.findAll('th').map((header) => header.text())).toEqual([
      'Nome',
      'Início',
      'Fim',
      'Status',
      'Ações',
    ])
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(3)
    expect(rows[0]!.text()).toContain('January')
    expect(rows[0]!.text()).toContain('01/01/2026')
    expect(rows[0]!.text()).toContain('31/01/2026')
    expect(rows[0]!.text()).toContain('Ativo')
    expect(rows[1]!.text()).toContain('Encerrado')
    expect(rows[2]!.text()).toContain('Contabilizado')
    expect(rows[0]!.find('a').attributes('href')).toBe('/financial-periods/p-1/detail')
  })

  it('filters by the period status', async () => {
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Contabilizados').trigger('click')
    await flushPromises()

    expect(listingCalls(vi.mocked(financialPeriodsApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ status: 'ACCOUNTED', page: 0 }),
    )
  })

  it('searches by name, sorts by status and clears the search', async () => {
    const { wrapper } = await render()

    await wrapper.find('input').setValue('Jan')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(listingCalls(vi.mocked(financialPeriodsApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ filter: 'Jan' }),
    )

    await buttonWithText(wrapper, 'Status').trigger('click')
    await flushPromises()
    expect(listingCalls(vi.mocked(financialPeriodsApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ sort: 'status,asc' }),
    )

    await wrapper.find('button[aria-label="Limpar filtro"]').trigger('click')
    await flushPromises()
    expect(listingCalls(vi.mocked(financialPeriodsApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ filter: '', status: 'OPEN' }),
    )
  })

  it('navigates to the form, the detail and the edit form', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Novo período financeiro').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('financial-periods.create')

    await chooseRowAction(wrapper, 1, 'Editar')
    expect(router.currentRoute.value.name).toBe('financial-periods.update')
    expect(router.currentRoute.value.params.id).toBe('p-2')

    await wrapper.findAll('tbody tr')[0]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('financial-periods.detail')
    expect(router.currentRoute.value.params.id).toBe('p-1')
  })

  it('removes a period after confirmation, naming it', async () => {
    const { wrapper } = await render()
    vi.mocked(financialPeriodsApi.remove).mockResolvedValue(undefined)
    const dialog = useConfirmDialog()

    await chooseRowAction(wrapper, 0, 'Remover')
    expect(dialog.state.options.title).toBe('Remover o período financeiro “January”?')
    dialog.accept()
    await flushPromises()

    expect(financialPeriodsApi.remove).toHaveBeenCalledWith('p-1')
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    expect(toast.success).toHaveBeenCalledWith('Período financeiro removido', {
      description: '“January” saiu da lista.',
      duration: 4000,
    })
  })

  it('keeps the period when the removal is not confirmed', async () => {
    const { wrapper } = await render()

    await chooseRowAction(wrapper, 0, 'Remover')
    useConfirmDialog().cancel()
    await flushPromises()

    expect(financialPeriodsApi.remove).not.toHaveBeenCalled()
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
  })

  it('shows the server error when the removal fails', async () => {
    const { wrapper } = await render()
    vi.mocked(financialPeriodsApi.remove).mockRejectedValue(
      problem(400, { error: 'financial-period-not-open' }),
    )

    await chooseRowAction(wrapper, 0, 'Remover')
    useConfirmDialog().accept()
    await flushPromises()

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'O período financeiro não esta aberto',
    )
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
  })

  it('invites the user to create the first period when none exists', async () => {
    const { wrapper, router } = await render([], { OPEN: 0, ACCOUNTED: 0, ALL: 0 })

    expect(wrapper.find('[data-state="empty"]').text()).toContain('Nenhum período financeiro ainda')

    await wrapper.find('[data-state="empty"] button').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('financial-periods.create')
  })

  it('says nothing matched the search, and shows the error state with a retry', async () => {
    const { wrapper } = await render([])
    await wrapper.find('input').setValue('zzz')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(wrapper.find('[data-state="no-result"]').text()).toContain('Nada encontrado para “zzz”')

    await wrapper.find('[data-state="no-result"] button').trigger('click')
    await flushPromises()
    expect(listingCalls(vi.mocked(financialPeriodsApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ filter: '' }),
    )

    vi.mocked(financialPeriodsApi.findAll).mockRejectedValue(problem(500))
    await wrapper.find('input').setValue('zzz')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(wrapper.find('[data-state="error"]').text()).toContain(
      'Não foi possível carregar os períodos financeiros',
    )

    serveListing(vi.mocked(financialPeriodsApi.findAll), periods, periods.length, COUNTS)
    await wrapper.find('[data-state="error"] button').trigger('click')
    await flushPromises()
    expect(stateOf(wrapper)).toBeUndefined()
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
  })
})
