import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { financialPeriodsApi } from '@/api/financialPeriods'
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
import FinancialPeriodListView from '@/views/financial/periods/FinancialPeriodListView.vue'

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

const periods: FinancialPeriodRow[] = [
  {
    id: 'p-1',
    name: 'January',
    startingAt: '2026-01-01',
    endingAt: '2026-01-31',
    status: 'OPEN',
    expired: false,
    reopenable: false,
    revenuesGoal: 5000,
    expensesGoal: 3000,
  },
  {
    id: 'p-2',
    name: 'December',
    startingAt: '2025-12-01',
    endingAt: '2025-12-31',
    status: 'OPEN',
    expired: true,
    reopenable: false,
  },
  {
    id: 'p-3',
    name: 'November',
    startingAt: '2025-11-01',
    endingAt: '2025-11-30',
    status: 'CLOSED',
    expired: false,
    reopenable: true,
  },
  {
    id: 'p-0',
    name: 'October',
    startingAt: '2025-10-01',
    endingAt: '2025-10-31',
    status: 'CLOSED',
    expired: false,
    reopenable: false,
  },
]

const COUNTS = { OPEN: 2, CLOSED: 2, ALL: 4 }

function serveResults() {
  vi.mocked(financialPeriodsApi.findResult).mockResolvedValue({
    revenues: 4000,
    expenses: 2500,
    result: 1500,
    toPay: 0,
    overdueExpenses: 0,
    recorded: false,
  })
}

async function render(content = periods, counts: Record<string, number> = COUNTS) {
  serveListing(vi.mocked(financialPeriodsApi.findAll), content, content.length, counts)
  serveResults()
  return mountView(FinancialPeriodListView, 'financial-periods')
}

describe('FinancialPeriodListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('introduces the page and offers the open periods first, with the counts and a note', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Períodos')
    expect(wrapper.find('[data-slot="page-actions"]').text()).toBe('Criar')
    expect(wrapper.findAll('[aria-pressed]').map((button) => button.text())).toEqual([
      'Abertos 2',
      'Encerrados 2',
      'Todos 4',
    ])
    expect(buttonWithText(wrapper, 'Abertos').attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('[data-slot="tabs-card"]').text()).toContain(
      'Resultado só existe depois do fechamento.',
    )
  })

  it('loads the open periods, newest start first, with goals, result and status', async () => {
    const { wrapper } = await render()

    expect(listingCalls(vi.mocked(financialPeriodsApi.findAll))[0]).toEqual(
      expect.objectContaining({ status: 'OPEN', sort: 'startingAt,desc' }),
    )
    expect(wrapper.findAll('th').map((header) => header.text())).toEqual([
      'Período',
      'Início',
      'Fim',
      'Meta de receita',
      'Meta de despesa',
      'Resultado (R$)',
      'Situação',
      'Ações',
    ])
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(4)
    expect(rows[0]!.text()).toContain('January')
    expect(rows[0]!.text()).toContain('01/01/2026')
    expect(rows[0]!.text()).toContain('31/01/2026')
    expect(rows[0]!.text()).toContain('5.000,00')
    expect(rows[0]!.text()).toContain('3.000,00')
    expect(rows[0]!.text()).toContain('provisório')
    expect(rows[0]!.text()).toContain('Aberto')
    expect(rows[1]!.text()).toContain('0,00')
    expect(rows[1]!.text()).toContain('Aberto · expirado')
    expect(rows[2]!.text()).toContain('Encerrado')
    expect(rows[2]!.text()).toContain('1.500,00')
    expect(rows[2]!.text()).not.toMatch(/[+−]/)
    expect(rows[2]!.text()).not.toContain('provisório')
    expect(financialPeriodsApi.findResult).toHaveBeenCalledTimes(2)
    expect(financialPeriodsApi.findResult).toHaveBeenCalledWith('p-3')
    expect(rows[1]!.attributes('data-state')).toBe('selected')
    expect(rows[0]!.attributes('data-state')).toBeUndefined()
    expect(rows[0]!.find('button[aria-label="Mais ações"]').exists()).toBe(true)
    expect(rows[2]!.find('button[aria-label="Mais ações"]').exists()).toBe(true)
    expect(rows[0]!.find('a').attributes('href')).toBe('/financial-periods/p-1/detail')
  })

  it('warns above the tabs about the expired periods', async () => {
    const { wrapper } = await render()

    const notice = wrapper.find('[data-slot="expired-notice"]')
    expect(notice.text()).toContain('1 período expirado: DecemberAinda aceita lançamentos.')
    expect(
      notice.element.compareDocumentPosition(wrapper.find('[data-slot="tabs-card"]').element) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(financialPeriodsApi.findAll).toHaveBeenCalledWith({ status: 'OPEN', size: 100 })
  })

  it('shows no warning when no open period is expired', async () => {
    const { wrapper } = await render([periods[0]!, periods[2]!])

    expect(wrapper.find('[data-slot="expired-notice"]').exists()).toBe(false)
  })

  it('names every expired period in the warning', async () => {
    const { wrapper } = await render([periods[1]!, { ...periods[1]!, id: 'p-4', name: 'October' }])

    expect(wrapper.find('[data-slot="expired-notice"]').text()).toContain(
      '2 períodos expirados: December, OctoberAinda aceita lançamentos.',
    )
  })

  it('shows the server error when the expired periods cannot be loaded', async () => {
    vi.mocked(financialPeriodsApi.findAll).mockImplementation((query) =>
      query.size === 100
        ? Promise.reject(problem(500))
        : Promise.resolve({
            content: periods,
            page: { size: 15, number: 0, totalElements: 3, totalPages: 1 },
          }),
    )
    serveResults()

    const { wrapper } = await mountView(FinancialPeriodListView, 'financial-periods')

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-slot="expired-notice"]').exists()).toBe(false)
  })

  it('filters by the period status', async () => {
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Encerrados').trigger('click')
    await flushPromises()

    expect(listingCalls(vi.mocked(financialPeriodsApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ status: 'CLOSED', page: 0 }),
    )
  })

  it('sorts by status', async () => {
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Situação').trigger('click')
    await flushPromises()

    expect(listingCalls(vi.mocked(financialPeriodsApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ sort: 'status,asc' }),
    )
  })

  it('navigates to the form, the edit form and the detail', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Criar').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('financial-periods.create')

    await chooseRowAction(wrapper, 1, 'Editar nome e metas')
    expect(router.currentRoute.value.name).toBe('financial-periods.update')
    expect(router.currentRoute.value.params.id).toBe('p-2')

    await wrapper.findAll('tbody tr')[0]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('financial-periods.detail')
    expect(router.currentRoute.value.params.id).toBe('p-1')
  })

  it('offers closing and editing on an open period, never an exclusion', async () => {
    const { wrapper } = await render()

    await wrapper.find('button[aria-label="Mais ações"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    const items = [...document.body.querySelectorAll('[role="menuitem"]')].map((item) =>
      item.textContent?.trim(),
    )
    expect(items).toEqual(['Fechar período', 'Editar nome e metas'])
  })

  it('goes to the closing of the period from the row menu', async () => {
    const { wrapper, router } = await render()
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)

    await chooseRowAction(wrapper, 0, 'Fechar período')

    expect(push).toHaveBeenCalledWith({ name: 'closing', query: { period: 'p-1' } })
  })

  it('goes to the closing of the oldest expired period from the warning', async () => {
    const { wrapper, router } = await render([
      periods[1]!,
      { ...periods[1]!, id: 'p-5', name: 'September', endingAt: '2025-09-30' },
    ])
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)

    const button = wrapper.find('[data-slot="close-expired"]')
    expect(button.text()).toBe('Fechar September')
    await button.trigger('click')

    expect(push).toHaveBeenCalledWith({ name: 'closing', query: { period: 'p-5' } })
  })

  it('names every expired period in the warning, oldest first', async () => {
    const { wrapper } = await render([
      periods[1]!,
      { ...periods[1]!, id: 'p-5', name: 'September', endingAt: '2025-09-30' },
    ])

    expect(wrapper.find('[data-slot="expired-notice"]').text()).toContain(
      '2 períodos expirados: September, December',
    )
  })

  async function rowMenu(wrapper: Awaited<ReturnType<typeof render>>['wrapper'], row: number) {
    await wrapper
      .findAll('button[aria-label="Mais ações"]')
      [row]!.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    return [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].map((item) => ({
      text: item.textContent?.trim(),
      disabled: item.getAttribute('aria-disabled') ?? 'false',
      title: item.getAttribute('title'),
    }))
  }

  it('offers reopening on the last closed period', async () => {
    const { wrapper } = await render()

    expect(await rowMenu(wrapper, 2)).toEqual([{ text: 'Reabrir', disabled: 'false', title: null }])
  })

  it('shows reopening disabled, with the hint, on the other closed periods', async () => {
    const { wrapper } = await render()

    expect(await rowMenu(wrapper, 3)).toEqual([
      {
        text: 'Reabrir só o último',
        disabled: 'true',
        title: 'Só o último período encerrado reabre',
      },
    ])
  })

  it('reopens the last closed period after confirming and reloads the listing and the warning', async () => {
    const { wrapper } = await render()
    vi.mocked(financialPeriodsApi.reopen).mockResolvedValue(undefined)

    await chooseRowAction(wrapper, 2, 'Reabrir')
    expect(document.body.textContent).toContain('Reabrir November?')
    expect(document.body.textContent).toContain('Faturas vazias voltam a ficar abertas.')
    const listings = listingCalls(vi.mocked(financialPeriodsApi.findAll)).length
    ;[...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
      .find((button) => button.textContent?.trim() === 'Reabrir período')!
      .click()
    await flushPromises()
    await flushPromises()

    expect(financialPeriodsApi.reopen).toHaveBeenCalledWith('p-3')
    expect(toast.success).toHaveBeenCalledWith('November reaberto', {
      description: 'O resultado saiu da tabela e o período voltou a aceitar lançamentos.',
      duration: 4000,
    })
    expect(listingCalls(vi.mocked(financialPeriodsApi.findAll)).length).toBeGreaterThan(listings)
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })

  it('keeps the reopening dialog open on a refusal and closes it with Cancel', async () => {
    const { wrapper } = await render()
    vi.mocked(financialPeriodsApi.reopen).mockRejectedValue(
      problem(409, { error: 'only-the-last-closed-period-can-be-reopened' }),
    )

    await chooseRowAction(wrapper, 2, 'Reabrir')
    ;[...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
      .find((button) => button.textContent?.trim() === 'Reabrir período')!
      .click()
    await flushPromises()
    await flushPromises()

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
    expect(
      document.body.querySelector('[role="dialog"] [data-slot="server-error"]')?.textContent,
    ).toContain('Um erro inesperado aconteceu')
    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(false)
    ;[...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
      .find((button) => button.textContent?.trim() === 'Cancelar')!
      .click()
    await flushPromises()
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()

    await chooseRowAction(wrapper, 2, 'Reabrir')
    expect(document.body.querySelector('[role="dialog"] [data-slot="server-error"]')).toBeNull()
  })

  it('signs a closed result only when it is negative', async () => {
    vi.mocked(financialPeriodsApi.findResult).mockResolvedValue({
      revenues: 100,
      expenses: 400,
      result: -300,
      toPay: 0,
      overdueExpenses: 0,
      recorded: true,
    })
    serveListing(vi.mocked(financialPeriodsApi.findAll), periods, periods.length, COUNTS)
    const { wrapper } = await mountView(FinancialPeriodListView, 'financial-periods')

    const closed = wrapper.findAll('tbody tr')[2]!
    expect(closed.text().split(String.fromCharCode(160)).join(' ')).toContain('−300,00')
  })

  it('invites the user to create the first period when none exists', async () => {
    const { wrapper, router } = await render([], { OPEN: 0, CLOSED: 0, ALL: 0 })

    expect(wrapper.find('[data-state="empty"]').text()).toContain('Nenhum período criado')

    await wrapper.find('[data-state="empty"] button').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('financial-periods.create')
  })

  it('says nothing matched the search, and shows the error state with a retry', async () => {
    serveListing(vi.mocked(financialPeriodsApi.findAll), [], 0, COUNTS)
    const { wrapper } = await mountView(
      FinancialPeriodListView,
      'financial-periods',
      {},
      {},
      '/financial-periods?filter=zzz&status=CLOSED',
    )
    expect(wrapper.find('[data-state="no-result"]').text()).toContain('Nada encontrado para “zzz”')

    await wrapper.find('[data-state="no-result"] button').trigger('click')
    await flushPromises()
    expect(listingCalls(vi.mocked(financialPeriodsApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ status: 'ALL' }),
    )

    vi.mocked(financialPeriodsApi.findAll).mockRejectedValue(problem(500))
    await buttonWithText(wrapper, 'Encerrados').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-state="error"]').text()).toContain(
      'Não foi possível carregar os períodos financeiros',
    )

    serveListing(vi.mocked(financialPeriodsApi.findAll), periods, periods.length, COUNTS)
    await wrapper.find('[data-state="error"] button').trigger('click')
    await flushPromises()
    expect(stateOf(wrapper)).toBeUndefined()
    expect(wrapper.findAll('tbody tr')).toHaveLength(4)
  })

  it('opens with the state of the URL, which stays there', async () => {
    const location = '/financial-periods?filter=Ab&status=CLOSED&page=2&size=30&sort=status,asc'
    serveListing(vi.mocked(financialPeriodsApi.findAll), periods, 70)
    serveResults()

    const { router } = await mountView(
      FinancialPeriodListView,
      'financial-periods',
      {},
      {},
      location,
    )

    expect(listingCalls(vi.mocked(financialPeriodsApi.findAll))[0]).toEqual({
      filter: 'Ab',
      status: 'CLOSED',
      page: 1,
      size: 30,
      sort: 'status,asc',
    })
    expect(router.currentRoute.value.fullPath).toBe(location)
  })
})
