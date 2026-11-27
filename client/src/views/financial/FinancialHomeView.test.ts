import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { importsApi } from '@/api/imports'
import { invoicesApi } from '@/api/invoices'
import { movementsApi } from '@/api/movements'
import { recurringMovementsApi } from '@/api/recurringMovements'
import { transfersApi } from '@/api/transfers'
import { walletsApi } from '@/api/wallets'
import { useFinancialPeriodsStore } from '@/stores/financialPeriods'
import { createTestPlugins } from '@/test/mounting'
import type { FinancialPeriodListView, WalletListView } from '@/types'
import FinancialHomeView from '@/views/financial/FinancialHomeView.vue'

vi.mock('@/api/financialPeriods')
vi.mock('@/api/imports')
vi.mock('@/api/invoices')
vi.mock('@/api/movements')
vi.mock('@/api/recurringMovements')
vi.mock('@/api/transfers')
vi.mock('@/api/wallets')

function pageOf(total: number) {
  return { content: [], page: { size: 1, number: 0, totalElements: total, totalPages: total } }
}

function listOf<T>(content: T[]) {
  return {
    content,
    page: { size: 100, number: 0, totalElements: content.length, totalPages: 1 },
  }
}

function period(
  id: string,
  startingAt: string,
  endingAt: string,
  expired: boolean,
): FinancialPeriodListView {
  return {
    id,
    name: id,
    startingAt,
    endingAt,
    status: 'OPEN',
    expired,
  } as FinancialPeriodListView
}

const wallet = { id: 'w-1', name: 'Conta corrente', active: true } as WalletListView

function render() {
  const { plugins } = createTestPlugins()
  const financialPeriods = useFinancialPeriodsStore()
  vi.mocked(financialPeriods.count).mockResolvedValue(7)
  return { financialPeriods, wrapper: mount(FinancialHomeView, { global: { plugins } }) }
}

function card(wrapper: ReturnType<typeof render>['wrapper'], href: string) {
  const link = wrapper.find(`a[href="${href}"]`)
  return {
    count: link.find('[data-slot="module-card-count"]'),
    attention: link.find('[data-slot="module-card-attention"]'),
    link,
  }
}

describe('FinancialHomeView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 24))
    vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(
      listOf([
        period('dez', '2026-12-01', '2026-12-31', false),
        period('nov', '2026-11-01', '2026-11-30', false),
        period('out', '2026-10-01', '2026-10-31', true),
        period('set', '2026-09-01', '2026-09-30', true),
      ]),
    )
    vi.mocked(movementsApi.findAll).mockImplementation(async (query) =>
      pageOf(query.overdue ? 5 : 24),
    )
    vi.mocked(transfersApi.findAll).mockResolvedValue(pageOf(6))
    vi.mocked(walletsApi.findAll).mockResolvedValue(listOf([wallet]))
    vi.mocked(recurringMovementsApi.findAll).mockResolvedValue(pageOf(11))
    vi.mocked(invoicesApi.findAll).mockImplementation(async (query) =>
      pageOf(query.statuses ? 1 : 4),
    )
    vi.mocked(importsApi.counts).mockResolvedValue({
      processing: 1,
      ready: 2,
      failed: 1,
      saved: 3,
      undone: 0,
      total: 7,
    })
  })

  it('introduces the module and links every item of the side menu', async () => {
    const { wrapper } = render()
    await flushPromises()

    expect(wrapper.find('[data-slot="page-title"]').text()).toBe('Financeiro')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe(
      'Lançamentos, cartões, recorrentes e fechamento de cada período.',
    )
    const links = wrapper.findAll('a[data-slot="module-card"]')
    expect(links.map((link) => link.attributes('href'))).toEqual([
      '/financial/movements',
      '/financial/transfers',
      '/financial/statement',
      '/financial/recurring-movements',
      '/financial/invoices',
      '/financial/imports',
      '/financial/periods',
      '/financial/closing',
    ])
    expect(card(wrapper, '/financial/periods').link.text()).toContain(
      'Criar, encerrar e reabrir períodos.',
    )
    expect(wrapper.findAll('[aria-disabled="true"]')).toHaveLength(0)
  })

  it('counts what each destination shows and flags what asks for attention', async () => {
    const { wrapper } = render()
    await flushPromises()

    expect(card(wrapper, '/financial/movements').count.text()).toBe('24')
    expect(card(wrapper, '/financial/movements').attention.text()).toBe('5 vencidos')
    expect(card(wrapper, '/financial/transfers').count.text()).toBe('6')
    expect(card(wrapper, '/financial/transfers').attention.exists()).toBe(false)
    expect(card(wrapper, '/financial/statement').count.text()).toBe('Conta corrente')
    expect(card(wrapper, '/financial/recurring-movements').count.text()).toBe('11')
    expect(card(wrapper, '/financial/invoices').count.text()).toBe('4')
    expect(card(wrapper, '/financial/invoices').attention.text()).toBe('1 fechada a pagar')
    expect(card(wrapper, '/financial/imports').count.text()).toBe('7')
    expect(card(wrapper, '/financial/imports').attention.text()).toBe(
      '2 para conferir · 1 com erro',
    )
    expect(card(wrapper, '/financial/periods').count.text()).toBe('7')
    expect(card(wrapper, '/financial/periods').attention.text()).toBe('2 expirados')
    expect(card(wrapper, '/financial/closing').count.exists()).toBe(false)
    expect(card(wrapper, '/financial/closing').attention.text()).toBe('Setembro pendente')
  })

  it('asks for the movements and the invoices of the period that opens by default', async () => {
    render()
    await flushPromises()

    expect(movementsApi.findAll).toHaveBeenCalledWith({ financialPeriods: ['nov'], size: 1 })
    expect(invoicesApi.findAll).toHaveBeenCalledWith({ financialPeriod: 'nov', size: 1 })
    expect(recurringMovementsApi.findAll).toHaveBeenCalledWith({ ended: false, size: 1 })
  })

  it('uses the singular and shows no badge when nothing asks for attention', async () => {
    vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(
      listOf([period('nov', '2026-11-01', '2026-11-30', false)]),
    )
    vi.mocked(movementsApi.findAll).mockImplementation(async (query) =>
      pageOf(query.overdue ? 1 : 3),
    )
    vi.mocked(invoicesApi.findAll).mockImplementation(async (query) =>
      pageOf(query.statuses ? 0 : 2),
    )
    const { wrapper } = render()
    await flushPromises()

    expect(card(wrapper, '/financial/movements').attention.text()).toBe('1 vencido')
    expect(card(wrapper, '/financial/invoices').attention.exists()).toBe(false)
    expect(card(wrapper, '/financial/periods').attention.exists()).toBe(false)

    vi.mocked(importsApi.counts).mockResolvedValue({
      processing: 0,
      ready: 0,
      failed: 0,
      saved: 0,
      undone: 0,
      total: 0,
    })
    expect(card(wrapper, '/financial/closing').attention.exists()).toBe(false)
  })

  it('leaves the period counts out when there is no open period or active wallet', async () => {
    vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(listOf([]))
    vi.mocked(walletsApi.findAll).mockResolvedValue(listOf([]))
    const { wrapper } = render()
    await flushPromises()

    expect(card(wrapper, '/financial/movements').count.exists()).toBe(false)
    expect(card(wrapper, '/financial/invoices').count.exists()).toBe(false)
    expect(card(wrapper, '/financial/statement').count.exists()).toBe(false)
    expect(card(wrapper, '/financial/transfers').count.text()).toBe('6')
  })

  it('shows the cards without count or badge when the calls fail', async () => {
    const failure = new Error('down')
    vi.mocked(financialPeriodsApi.findAll).mockRejectedValue(failure)
    vi.mocked(movementsApi.findAll).mockRejectedValue(failure)
    vi.mocked(transfersApi.findAll).mockRejectedValue(failure)
    vi.mocked(walletsApi.findAll).mockRejectedValue(failure)
    vi.mocked(recurringMovementsApi.findAll).mockRejectedValue(failure)
    vi.mocked(invoicesApi.findAll).mockRejectedValue(failure)
    vi.mocked(importsApi.counts).mockRejectedValue(failure)
    const { wrapper } = render()
    await flushPromises()

    expect(wrapper.findAll('[data-slot="module-card-attention"]')).toHaveLength(0)
    expect(wrapper.findAll('[data-slot="module-card-count"]').map((count) => count.text())).toEqual(
      ['7'],
    )
  })

  it('counts the periods through the store', async () => {
    const { financialPeriods } = render()
    await flushPromises()

    expect(financialPeriods.count).toHaveBeenCalledWith('ALL')
  })
})
