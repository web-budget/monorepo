import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { cardsApi } from '@/api/cards'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { invoicesApi } from '@/api/invoices'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import {
  buttonWithText,
  chooseRowAction,
  mountView,
  namedTestRoutes,
  pageOf,
  problem,
} from '@/test/crud'
import type {
  CardListView,
  CardView,
  FinancialPeriodListView,
  FinancialPeriodView,
  InvoiceQuery,
  InvoiceView,
} from '@/types'
import InvoiceListView from '@/views/financial/invoices/InvoiceListView.vue'

vi.mock('@/api/invoices')
vi.mock('@/api/cards')
vi.mock('@/api/financialPeriods')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

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

const visa = { id: 'c-1', name: 'Visa Platinum', lastFourDigits: '4821' }
const master = { id: 'c-2', name: 'Master', lastFourDigits: '1177' }

const invoices: InvoiceView[] = [
  {
    id: 'i-1',
    status: 'OPEN',
    value: 500,
    purchaseCount: 4,
    card: visa,
    financialPeriod: { id: 'p-11', name: 'Novembro', status: 'OPEN', expired: false },
  },
  {
    id: 'i-2',
    status: 'CLOSED',
    value: 80.5,
    purchaseCount: 2,
    dueDate: '2026-12-10',
    card: master,
    financialPeriod: { id: 'p-11', name: 'Novembro', status: 'OPEN', expired: false },
    payment: { id: 'm-1', name: 'Pagamento de fatura, Master', value: 80.5 },
  },
  {
    id: 'i-3',
    status: 'PAID',
    value: 0,
    purchaseCount: 0,
    card: visa,
    financialPeriod: { id: 'p-10', name: 'Outubro', status: 'OPEN', expired: false },
  },
]

function serve(content = invoices, total = content.length, periodList = periods) {
  vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf(periodList))
  vi.mocked(cardsApi.findAll).mockResolvedValue(
    pageOf([{ id: 'c-1', name: 'Visa Platinum' }] as CardListView[]),
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
  return mountView(
    InvoiceListView,
    'invoices',
    {},
    {},
    location,
    namedTestRoutes('purchases.create', 'invoices.import', 'financial-periods.create'),
  )
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

  it('opens on the period that contains today, by the name of the card, with the counts', async () => {
    const { wrapper, router } = await render()

    expect(wrapper.find('h1').text()).toBe('Fatura do cartão')
    expect(lastQuery()).toEqual({
      card: undefined,
      financialPeriod: 'p-11',
      statuses: undefined,
      page: 0,
      size: 15,
      sort: 'name,asc',
    })
    expect(router.currentRoute.value.query).toEqual({ period: 'p-11' })
    expect(wrapper.findAll('[data-slot="status-count"]').map((count) => count.text())).toEqual([
      '3',
      '3',
      '3',
      '3',
    ])
  })

  it('shows the card with its last digits, the period, the purchases, the due date, the total and the status', async () => {
    const { wrapper } = await render()

    expect(wrapper.findAll('thead th').map((header) => header.text())).toEqual([
      'Cartão',
      'Período',
      'Compras',
      'Vencimento',
      'Total (R$)',
      'Situação',
      'Ações',
    ])
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(3)
    expect(rows[0]!.findAll('td').map((cell) => cell.text())).toEqual([
      'Visa Platinum ••4821',
      'Novembro',
      '4',
      'após fechar',
      '500,00',
      'Aberta',
      '',
    ])
    expect(rows[1]!.findAll('td').map((cell) => cell.text())).toEqual([
      'Master ••1177',
      'Novembro',
      '2',
      '10/12/2026',
      '80,50',
      'Fechada',
      '',
    ])
    expect(rows[1]!.attributes('data-state')).toBe('selected')
    expect(rows[2]!.find('td:nth-child(4)').text()).toBe('após fechar')
    expect(rows[2]!.text()).toContain('Paga')
    expect(wrapper.text()).toContain('1–3 de 3 faturas')
  })

  it('offers the import and the new purchase in the header', async () => {
    const { wrapper } = await render()

    expect(
      wrapper
        .find('[data-slot="page-actions"]')
        .findAll('button')
        .map((button) => button.text()),
    ).toEqual(['Importar fatura', 'Nova compra'])
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

  it('shows the empty state with a way to create a period and clears the filters from no-result', async () => {
    const { wrapper, router } = await render(undefined, [])
    const empty = wrapper.find('[data-state="empty"]')
    expect(empty.text()).toContain('Nenhuma fatura neste período')
    expect(empty.text()).toContain('Crie um período para gerar as faturas.')
    expect(empty.find('button').text()).toBe('Criar')

    await empty.find('button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('financial-periods.create')

    vi.mocked(invoicesApi.findAll).mockResolvedValue(pageOf([]))
    await buttonWithText(wrapper, 'Pagas').trigger('click')
    await flushPromises()
    const noResult = wrapper.find('[data-state="no-result"]')
    expect(noResult.text()).toContain('Nenhuma fatura com esses filtros')
    expect(noResult.text()).toContain('Mude os filtros ou limpe a busca.')

    await noResult.find('button').trigger('click')
    await flushPromises()
    expect(lastQuery()).toMatchObject({ statuses: undefined, financialPeriod: undefined })
  })

  it('shows the error state and retries', async () => {
    serve()
    vi.mocked(invoicesApi.findAll).mockRejectedValue(problem(500))
    const { wrapper } = await mountView(InvoiceListView, 'invoices')
    const error = wrapper.find('[data-state="error"]')
    expect(error.text()).toContain('Não foi possível carregar as faturas')
    expect(error.text()).toContain('O servidor não respondeu. Seus filtros continuam na URL.')

    vi.mocked(invoicesApi.findAll).mockResolvedValue(pageOf(invoices))
    await error.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-state="error"]').exists()).toBe(false)
  })

  it('shows the server error when the options cannot be loaded', async () => {
    serve()
    vi.mocked(cardsApi.findAll).mockRejectedValue(problem(500))

    const { wrapper } = await mountView(InvoiceListView, 'invoices')

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
  })

  it('goes to the purchase form and to the import from the header buttons', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Nova compra').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('purchases.create')
    expect(router.currentRoute.value.query).toEqual({})

    await buttonWithText(wrapper, 'Importar fatura').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('invoices.import')
    expect(router.currentRoute.value.query).toEqual({})
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

  it('offers the row menu: open, and on an open invoice a purchase, the import and the close', async () => {
    const { wrapper, router } = await render()

    await wrapper.findAll('button[aria-label="Mais ações"]')[0]!.trigger('keydown', {
      key: 'Enter',
    })
    await flushPromises()
    expect(
      [...document.body.querySelectorAll('[role="menuitem"]')].map((item) =>
        item.textContent?.trim(),
      ),
    ).toEqual(['Abrir fatura', 'Nova compra', 'Importar fatura', 'Fechar fatura'])
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    await chooseRowAction(wrapper, 0, 'Nova compra')
    expect(router.currentRoute.value.name).toBe('purchases.create')
    expect(router.currentRoute.value.query).toEqual({ card: 'c-1', period: 'p-11' })

    await chooseRowAction(wrapper, 0, 'Importar fatura')
    expect(router.currentRoute.value.name).toBe('invoices.import')
    expect(router.currentRoute.value.query).toEqual({ card: 'c-1', period: 'p-11' })

    await chooseRowAction(wrapper, 1, 'Abrir fatura')
    expect(router.currentRoute.value.name).toBe('invoices.detail')
    expect(router.currentRoute.value.params.id).toBe('i-2')
  })

  it('offers only to open an invoice that is no longer open', async () => {
    const { wrapper } = await render()

    await wrapper.findAll('button[aria-label="Mais ações"]')[1]!.trigger('keydown', {
      key: 'Enter',
    })
    await flushPromises()

    expect(
      [...document.body.querySelectorAll('[role="menuitem"]')].map((item) =>
        item.textContent?.trim(),
      ),
    ).toEqual(['Abrir fatura'])
  })

  it('previews the close from the row menu, then closes and reloads', async () => {
    const { wrapper } = await render()
    vi.mocked(cardsApi.findById).mockResolvedValue({
      id: 'c-1',
      invoicePaymentDay: 10,
      wallet: { name: 'Conta corrente' },
    } as CardView)
    vi.mocked(financialPeriodsApi.findById).mockResolvedValue({
      id: 'p-11',
      name: 'Novembro de 2026',
      endingAt: '2026-11-30',
    } as FinancialPeriodView)
    vi.mocked(invoicesApi.close).mockResolvedValue({ ...invoices[0]!, status: 'CLOSED' })

    await chooseRowAction(wrapper, 0, 'Fechar fatura')
    await flushPromises()

    const dialog = document.body.textContent!
    expect(dialog).toContain('Fechar a fatura de Novembro, Visa Platinum?')
    expect(dialog).toContain('10/12/2026')
    expect(dialog).toContain('Conta corrente')
    const reloads = listCalls().length

    ;[...document.body.querySelectorAll('button')]
      .find((button) => button.textContent?.trim() === 'Fechar fatura')!
      .click()
    await flushPromises()

    expect(invoicesApi.close).toHaveBeenCalledWith('i-1')
    expect(toast.success).toHaveBeenCalledWith('Fatura fechada', {
      description: 'Pagamento de fatura de 500,00 gerado, em aberto.',
      duration: 4000,
    })
    expect(listCalls().length).toBeGreaterThan(reloads)
  })
})
