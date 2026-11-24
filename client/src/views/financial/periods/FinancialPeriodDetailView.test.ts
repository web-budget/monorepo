import { beforeEach, describe, expect, it, vi } from 'vitest'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { movementsApi } from '@/api/movements'
import { flushPromises } from '@vue/test-utils'
import { toast } from 'vue-sonner'
import DetailCard from '@/components/common/DetailCard.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { mountView, problem } from '@/test/crud'
import type { FinancialPeriodView } from '@/types'
import FinancialPeriodDetailView from '@/views/financial/periods/FinancialPeriodDetailView.vue'

vi.mock('@/api/financialPeriods')
vi.mock('@/api/movements')
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
  reopenable: false,
  revenuesGoal: 5000,
  expensesGoal: null,
}

const result = {
  revenues: 3000,
  expenses: 3500,
  result: -500,
  toPay: 0,
  overdueExpenses: 0,
  recorded: false,
}

function serveMovementTotals() {
  vi.mocked(movementsApi.findAll).mockImplementation((query) => {
    const total = query.statuses?.[0] === 'OPEN' ? 4 : query.statuses?.[0] === 'PAID' ? 3 : 7
    return Promise.resolve({
      content: [],
      page: { size: 1, number: 0, totalElements: total, totalPages: total },
    })
  })
}

async function render(view: FinancialPeriodView = period) {
  vi.mocked(financialPeriodsApi.findById).mockResolvedValue(view)
  vi.mocked(financialPeriodsApi.findResult).mockResolvedValue(result)
  serveMovementTotals()
  return mountView(FinancialPeriodDetailView, 'financial-periods', { id: 'p-1' })
}

describe('FinancialPeriodDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the period with its status next to the title, then identification, result and movements', async () => {
    const { wrapper } = await render()

    expect(financialPeriodsApi.findById).toHaveBeenCalledWith('p-1')
    expect(wrapper.find('h1').text()).toBe('January')
    expect(wrapper.find('[data-slot="page-title"]').element.parentElement!.textContent).toContain(
      'Aberto',
    )
    expect(financialPeriodsApi.findResult).toHaveBeenCalledWith('p-1')
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual([
      'Identificação',
      'Resultado provisório',
      'Movimentos',
    ])
    expect(wrapper.text()).toContain('01/01/2026')
    expect(wrapper.text()).toContain('31/01/2026')
    expect(wrapper.text()).toContain('5.000,00')
    expect(wrapper.text()).toMatch(/R\$\s0,00/)
    expect(wrapper.text()).toContain('3.000,00')
    expect(wrapper.text()).toContain('3.500,00')
    expect(wrapper.text()).toMatch(/R\$\s500,00/)
  })

  it('counts the launched, open and paid movements', async () => {
    const { wrapper } = await render()

    expect(movementsApi.findAll).toHaveBeenCalledTimes(3)
    const text = wrapper.text()
    expect(text).toMatch(/Lançados\s*7/)
    expect(text).toMatch(/Em aberto\s*4/)
    expect(text).toMatch(/Pagos\s*3/)
  })

  it('offers to see the movements of the period in the footer', async () => {
    const { wrapper } = await render()

    const link = wrapper.find('[data-slot="detail-footer"] a')
    expect(link.text()).toBe('Ver movimentos')
    expect(link.attributes('href')).toBe('/financial/movements?period=p-1')
  })

  it('offers to close an open period from the footer', async () => {
    const { wrapper, router } = await render()
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)

    const footer = wrapper.find('[data-slot="detail-footer"]')
    expect(footer.findAll('a, button').map((item) => item.text())).toEqual([
      'Ver movimentos',
      'Fechar período',
    ])
    await footer.findAll('button')[0]!.trigger('click')

    expect(push).toHaveBeenCalledWith({ name: 'closing', query: { period: 'p-1' } })
  })

  it('offers no closing and no reopening on a closed period that cannot be reopened', async () => {
    const { wrapper } = await render({ ...period, status: 'CLOSED' })

    expect(
      wrapper
        .find('[data-slot="detail-footer"]')
        .findAll('a, button')
        .map((item) => item.text()),
    ).toEqual(['Ver movimentos'])
  })

  it('reopens the last closed period after confirming, tells it and reloads the period', async () => {
    const { wrapper } = await render({ ...period, status: 'CLOSED', reopenable: true })
    vi.mocked(financialPeriodsApi.reopen).mockResolvedValue(undefined)
    vi.mocked(financialPeriodsApi.findById).mockResolvedValue({ ...period, status: 'OPEN' })

    await wrapper
      .find('[data-slot="detail-footer"]')
      .findAll('button')
      .find((button) => button.text() === 'Reabrir')!
      .trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('Reabrir January?')
    expect(document.body.textContent).toContain('Só o último período encerrado pode ser reaberto.')
    expect(document.body.textContent).toContain('Apaga o resultado do período.')
    ;[...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
      .find((button) => button.textContent?.trim() === 'Reabrir período')!
      .click()
    await flushPromises()
    await flushPromises()

    expect(financialPeriodsApi.reopen).toHaveBeenCalledWith('p-1')
    expect(toast.success).toHaveBeenCalledWith('January reaberto', {
      description: 'O resultado saiu da tabela e o período voltou a aceitar lançamentos.',
      duration: 4000,
    })
    expect(financialPeriodsApi.findById).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-slot="page-title"]').element.parentElement!.textContent).toContain(
      'Aberto',
    )
  })

  it('keeps the reopening dialog open and shows the refusal of the server', async () => {
    const { wrapper } = await render({ ...period, status: 'CLOSED', reopenable: true })
    vi.mocked(financialPeriodsApi.reopen).mockRejectedValue(
      problem(409, { error: 'only-the-last-closed-period-can-be-reopened' }),
    )

    await wrapper
      .find('[data-slot="detail-footer"]')
      .findAll('button')
      .find((button) => button.text() === 'Reabrir')!
      .trigger('click')
    await flushPromises()
    ;[...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
      .find((button) => button.textContent?.trim() === 'Reabrir período')!
      .click()
    await flushPromises()
    await flushPromises()

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
    ;[...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
      .find((button) => button.textContent?.trim() === 'Cancelar')!
      .click()
    await flushPromises()
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })

  it('shows the closed result and offers no edit or removal', async () => {
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
    serveMovementTotals()
    const { wrapper } = await mountView(FinancialPeriodDetailView, 'financial-periods', {
      id: 'p-1',
    })

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual(['Identificação'])
  })

  it('shows no status while the period is loading', async () => {
    vi.mocked(financialPeriodsApi.findById).mockReturnValue(new Promise(() => undefined))
    vi.mocked(financialPeriodsApi.findResult).mockReturnValue(new Promise(() => undefined))
    serveMovementTotals()

    const { wrapper } = await mountView(FinancialPeriodDetailView, 'financial-periods', {
      id: 'p-1',
    })

    expect(wrapper.find('h1').text()).toBe('Detalhando')
    expect(wrapper.find('[data-slot="detail-footer"]').exists()).toBe(false)
    expect(
      wrapper.find('[data-slot="page-title"]').element.parentElement!.textContent,
    ).not.toContain('Encerrado')
  })

  it('shows the server error when the period cannot be loaded', async () => {
    vi.mocked(financialPeriodsApi.findById).mockRejectedValue(problem(404))
    vi.mocked(financialPeriodsApi.findResult).mockResolvedValue(result)
    serveMovementTotals()

    const { wrapper } = await mountView(FinancialPeriodDetailView, 'financial-periods', {
      id: 'p-9',
    })

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'O recurso solicitado não existe',
    )
  })

  it('goes to the edit form when the card asks to edit', async () => {
    const { wrapper, router } = await render()

    wrapper.findComponent(DetailCard).vm.$emit('edit')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('financial-periods.update')
  })

  it('asks first, naming the period, then removes it and goes to the listing', async () => {
    const { wrapper, router } = await render()
    vi.mocked(financialPeriodsApi.remove).mockResolvedValue(undefined)
    const dialog = useConfirmDialog()

    wrapper.findComponent(DetailCard).vm.$emit('delete')
    await flushPromises()
    expect(dialog.state.options.title).toBe('Excluir o período financeiro “January”?')
    dialog.accept()
    await flushPromises()

    expect(financialPeriodsApi.remove).toHaveBeenCalledWith('p-1')
    expect(toast.success).toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('financial-periods')
  })
})
