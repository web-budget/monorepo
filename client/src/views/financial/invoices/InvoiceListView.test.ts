import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cardsApi } from '@/api/cards'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { invoicesApi } from '@/api/invoices'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import { buttonWithText, mountView, pageOf, problem } from '@/test/crud'
import type { FinancialPeriodListView, InvoiceQuery, InvoiceView } from '@/types'
import InvoiceListView from '@/views/financial/invoices/InvoiceListView.vue'

vi.mock('@/api/invoices')
vi.mock('@/api/cards')
vi.mock('@/api/financialPeriods')

const periods = [
  {
    id: 'p-11',
    name: 'Novembro',
    startingAt: '2026-11-01',
    endingAt: '2026-11-30',
    status: 'OPEN',
  },
  { id: 'p-10', name: 'Outubro', startingAt: '2026-10-01', endingAt: '2026-10-31', status: 'OPEN' },
] as FinancialPeriodListView[]

const invoices: InvoiceView[] = [
  {
    id: 'i-1',
    status: 'OPEN',
    value: 500,
    card: { id: 'c-1', name: 'Visa Platinum' },
    financialPeriod: { id: 'p-11', name: 'Novembro', status: 'OPEN', expired: false },
  },
  {
    id: 'i-2',
    status: 'CLOSED',
    value: 80.5,
    card: { id: 'c-2', name: 'Master' },
    financialPeriod: { id: 'p-11', name: 'Novembro', status: 'OPEN', expired: false },
  },
  {
    id: 'i-3',
    status: 'PAID',
    value: 0,
    card: { id: 'c-1', name: 'Visa Platinum' },
    financialPeriod: { id: 'p-10', name: 'Outubro', status: 'OPEN', expired: false },
  },
]

function serve(content = invoices, total = content.length, periodList = periods) {
  vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf(periodList))
  vi.mocked(cardsApi.findAll).mockResolvedValue(
    pageOf([{ id: 'c-1', name: 'Visa Platinum' }] as never[]),
  )
  vi.mocked(invoicesApi.findAll).mockResolvedValue(pageOf(content, total))
}

function listCalls() {
  return vi.mocked(invoicesApi.findAll).mock.calls.filter(([query]) => query.size !== 1)
}

function lastQuery(): InvoiceQuery {
  return listCalls().slice(-1)[0]![0]
}

async function render(location?: string, content = invoices, total = content.length) {
  serve(content, total)
  return mountView(InvoiceListView, 'invoices', {}, {}, location)
}

describe('InvoiceListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 21))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens on the period that contains today and lists the invoices with the counts', async () => {
    const { wrapper, router } = await render()

    expect(wrapper.find('h1').text()).toBe('Fatura do cartão')
    expect(lastQuery()).toEqual({
      card: undefined,
      financialPeriod: 'p-11',
      statuses: undefined,
      page: 0,
      size: 15,
      sort: 'createdOn,desc',
    })
    expect(router.currentRoute.value.query).toEqual({ period: 'p-11' })
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(3)
    expect(rows[0]!.text()).toContain('Visa Platinum')
    expect(rows[0]!.text()).toContain('Novembro')
    expect(rows[0]!.text()).toMatch(/R\$\s500,00/)
    expect(rows[0]!.text()).toContain('Aberta')
    expect(rows[1]!.attributes('data-state')).toBe('selected')
    expect(rows[2]!.text()).toContain('Paga')
    expect(wrapper.findAll('[data-slot="status-count"]').map((count) => count.text())).toEqual([
      '3',
      '3',
      '3',
      '3',
    ])
  })

  it('opens with the state of the URL, which stays there', async () => {
    const location = '/invoices?period=p-10&card=c-1&status=OPEN&sort=value,asc'

    const { router } = await render(location)

    expect(lastQuery()).toEqual({
      card: 'c-1',
      financialPeriod: 'p-10',
      statuses: ['OPEN'],
      page: 0,
      size: 15,
      sort: 'value,asc',
    })
    expect(router.currentRoute.value.fullPath).toBe(location)
  })

  it('has no default period when there is none', async () => {
    serve(invoices, 3, [])
    await mountView(InvoiceListView, 'invoices')

    expect(lastQuery().financialPeriod).toBeUndefined()
  })

  it('reloads with each filter and with the tabs', async () => {
    const { wrapper } = await render()
    const selects = wrapper.findAllComponents(FilterSelect)

    selects[0]!.vm.$emit('update:modelValue', 'p-10')
    await flushPromises()
    expect(lastQuery().financialPeriod).toBe('p-10')

    selects[0]!.vm.$emit('update:modelValue', '')
    await flushPromises()
    expect(lastQuery().financialPeriod).toBeUndefined()

    selects[1]!.vm.$emit('update:modelValue', 'c-1')
    await flushPromises()
    expect(lastQuery().card).toBe('c-1')

    await buttonWithText(wrapper, 'Fechadas').trigger('click')
    await flushPromises()
    expect(lastQuery().statuses).toEqual(['CLOSED'])
  })

  it('sorts and goes to the next page', async () => {
    const { wrapper } = await render(undefined, invoices, 40)

    await buttonWithText(wrapper, 'Total (R$)').trigger('click')
    await flushPromises()
    expect(lastQuery().sort).toBe('value,asc')

    await wrapper.find('button[aria-label="Próxima página"]').trigger('click')
    await flushPromises()
    expect(lastQuery()).toMatchObject({ page: 1, size: 15 })
  })

  it('shows the empty state without a way to create and clears the filters from no-result', async () => {
    const { wrapper } = await render(undefined, [])
    expect(wrapper.find('[data-state="empty"]').text()).toContain('Nenhuma fatura neste período')
    expect(wrapper.find('[data-state="empty"] button').exists()).toBe(false)

    vi.mocked(invoicesApi.findAll).mockResolvedValue(pageOf([]))
    await buttonWithText(wrapper, 'Pagas').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-state="no-result"]').exists()).toBe(true)

    await wrapper.find('[data-state="no-result"] button').trigger('click')
    await flushPromises()
    expect(lastQuery()).toMatchObject({ statuses: undefined, financialPeriod: undefined })
  })

  it('shows the error state and retries', async () => {
    serve()
    vi.mocked(invoicesApi.findAll).mockRejectedValue(problem(500))
    const { wrapper } = await mountView(InvoiceListView, 'invoices')
    expect(wrapper.find('[data-state="error"]').exists()).toBe(true)

    vi.mocked(invoicesApi.findAll).mockResolvedValue(pageOf(invoices))
    await wrapper.find('[data-state="error"] button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-state="error"]').exists()).toBe(false)
  })

  it('shows the server error when the options cannot be loaded', async () => {
    serve()
    vi.mocked(cardsApi.findAll).mockRejectedValue(problem(500))

    const { wrapper } = await mountView(InvoiceListView, 'invoices')

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
  })

  it('goes to the purchase form from the header button', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Nova compra').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/financial/invoices/purchases/create')
  })

  it('leaves the count out when it cannot be read and opens the detail from the row', async () => {
    serve()
    vi.mocked(invoicesApi.findAll).mockImplementation((query) =>
      query.size === 1 ? Promise.reject(problem(500)) : Promise.resolve(pageOf(invoices)),
    )
    const { wrapper, router } = await mountView(InvoiceListView, 'invoices')
    await flushPromises()

    expect(wrapper.find('[data-slot="status-count"]').exists()).toBe(false)
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('invoices.detail')
    expect(router.currentRoute.value.params.id).toBe('i-1')
  })
})
