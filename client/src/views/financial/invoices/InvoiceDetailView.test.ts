import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { cardPurchasesApi } from '@/api/cardPurchases'
import { cardsApi } from '@/api/cards'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { invoicesApi } from '@/api/invoices'
import { movementsApi } from '@/api/movements'
import CloseInvoiceDialog from '@/components/invoices/CloseInvoiceDialog.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, namedTestRoutes, pageOf, problem } from '@/test/crud'
import type { CardPurchaseListView, CardView, FinancialPeriodView, InvoiceView } from '@/types'
import InvoiceDetailView from '@/views/financial/invoices/InvoiceDetailView.vue'

vi.mock('@/api/invoices')
vi.mock('@/api/cardPurchases')
vi.mock('@/api/cards')
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

const invoice: InvoiceView = {
  id: 'i-1',
  status: 'OPEN',
  value: 500,
  purchaseCount: 2,
  card: { id: 'c-1', name: 'Visa Platinum', lastFourDigits: '1234' },
  financialPeriod: { id: 'p-11', name: 'Novembro de 2026', status: 'OPEN', expired: false },
}

const payment = { id: 'm-1', name: 'Pagamento de fatura, Visa Platinum', value: 500 }

const purchases = [
  {
    id: 'cp-1',
    name: 'Mercado',
    purchasedOn: '2026-11-02',
    value: 300,
    costCenter: { id: 'cc-1', name: 'Casa', fullName: 'Casa' },
    classification: { id: 'cl-1', name: 'Mercado', type: 'EXPENSE' },
  },
  {
    id: 'cp-2',
    name: 'Posto',
    purchasedOn: '2026-11-04',
    value: 200,
    costCenter: { id: 'cc-2', name: 'Carro', fullName: 'Carro' },
    classification: { id: 'cl-2', name: 'Transporte', type: 'EXPENSE' },
  },
] as CardPurchaseListView[]

function serve(content: Partial<InvoiceView> = {}, purchaseList = purchases) {
  vi.mocked(invoicesApi.findById).mockImplementation((id) =>
    Promise.resolve({ ...invoice, id, ...content }),
  )
  vi.mocked(cardPurchasesApi.findAll).mockResolvedValue(pageOf(purchaseList))
  vi.mocked(cardsApi.findById).mockResolvedValue({
    id: 'c-1',
    lastFourDigits: '1234',
    invoicePaymentDay: 10,
    wallet: { id: 'w-1', name: 'Conta corrente' },
  } as CardView)
  vi.mocked(financialPeriodsApi.findById).mockResolvedValue({
    id: 'p-11',
    name: 'Novembro de 2026',
    endingAt: '2026-11-30',
  } as FinancialPeriodView)
}

async function render(content: Partial<InvoiceView> = {}, purchaseList = purchases) {
  serve(content, purchaseList)
  return mountView(
    InvoiceDetailView,
    'invoices',
    { id: 'i-1' },
    {},
    undefined,
    namedTestRoutes('purchases.create', 'purchases.detail', 'invoices.import', 'movements.detail'),
  )
}

function headerActions(wrapper: Awaited<ReturnType<typeof render>>['wrapper']) {
  return wrapper
    .find('[data-slot="page-actions"]')
    .findAll('a, button')
    .map((action) => action.text())
}

describe('InvoiceDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the open invoice with its card, its total, its purchases and the three actions', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Visa Platinum ••1234')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe('Novembro de 2026')
    expect(wrapper.find('[data-slot="page-title"]').text()).toBe('Visa Platinum ••1234')
    expect(wrapper.text()).toContain('Aberta')
    expect(headerActions(wrapper)).toEqual(['Importar fatura', 'Fechar fatura', 'Nova compra'])
    const summary = wrapper.find('[data-slot="summary"]').text()
    expect(summary).toMatch(/R\$\s500,00/)
    expect(summary).toContain('2')
    expect(summary).toContain('—')
    expect(wrapper.find('[data-slot="payment-bar"]').exists()).toBe(false)
    expect(wrapper.find('[data-slot="detail-footer"]').exists()).toBe(false)
  })

  it('lists the purchases with the date, the name, the cost center, the classification and the value', async () => {
    const { wrapper } = await render()

    expect(wrapper.findAll('thead th').map((header) => header.text())).toEqual([
      'Data',
      'Compra',
      'Centro de custo',
      'Classificação',
      'Valor (R$)',
    ])
    expect(
      wrapper
        .findAll('tbody tr')[0]!
        .findAll('td')
        .map((cell) => cell.text()),
    ).toEqual(['02/11/2026', 'Mercado', 'Casa', 'Mercado', '300,00'])
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    expect(cardPurchasesApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ invoice: 'i-1', sort: 'purchasedOn,desc' }),
    )
    expect(
      wrapper.find('[data-slot="items-cards"], tfoot, nav[aria-label="pagination"]').exists(),
    ).toBe(false)
  })

  it('offers a new purchase and the import for the card and the period, and opens a purchase from its row', async () => {
    const { wrapper, router } = await render()

    const purchase = wrapper.findAll('a').find((candidate) => candidate.text() === 'Nova compra')!
    expect(purchase.attributes('href')).toBe('/__purchases.create?card=c-1&period=p-11')
    const importation = wrapper
      .findAll('a')
      .find((candidate) => candidate.text() === 'Importar fatura')!
    expect(importation.attributes('href')).toBe('/__invoices.import?card=c-1&period=p-11')

    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('purchases.detail')
    expect(router.currentRoute.value.params.id).toBe('cp-1')
  })

  it('offers no new purchase and no import once the invoice is closed', async () => {
    const { wrapper } = await render({ status: 'CLOSED', dueDate: '2026-12-10', payment })

    expect(headerActions(wrapper)).toEqual([
      'Ver pagamento de fatura',
      'Excluir pagamento de fatura',
    ])
  })

  it('badges the purchases born from a recurring with the installment or "recorrente"', async () => {
    const { wrapper } = await render({}, [
      {
        ...purchases[0]!,
        name: 'Celular novo 10/12',
        recurringMovement: { id: 'r-1', name: 'Celular novo', installment: 10, installments: 12 },
      },
      {
        ...purchases[1]!,
        recurringMovement: { id: 'r-2', name: 'Streaming', installment: 4, installments: null },
      },
      { ...purchases[0]!, id: 'cp-3', name: 'Padaria' },
    ])

    const rows = wrapper.findAll('tbody tr')
    expect(rows.map((row) => row.findAll('td')[1]!.text())).toEqual([
      'Celular novo 10/12',
      'Posto recorrente',
      'Padaria',
    ])
    expect(rows.map((row) => row.find('[data-slot="installment"]').exists())).toEqual([
      true,
      true,
      false,
    ])
    expect(rows[0]!.find('[data-slot="installment"]').text()).toBe('10/12')
    expect(rows[1]!.find('[data-slot="installment"]').text()).toBe('recorrente')
  })

  it('says when there are no purchases and offers the first one while the invoice is open', async () => {
    const { wrapper } = await render({}, [])

    const empty = wrapper.find('[data-slot="no-purchases"]')
    expect(empty.text()).toContain('Nenhuma compra nesta fatura')
    expect(empty.find('a').text()).toBe('Nova compra')
    expect(wrapper.find('tbody').exists()).toBe(false)
  })

  it('offers nothing to add to a closed invoice without purchases', async () => {
    const { wrapper } = await render({ status: 'CLOSED' }, [])

    expect(wrapper.find('[data-slot="no-purchases"]').find('a').exists()).toBe(false)
    expect(wrapper.find('[data-slot="no-purchases"]').text()).toContain(
      'Nenhuma compra nesta fatura',
    )
  })

  it('previews the close with the month, the due date and the wallet, then closes and reloads', async () => {
    const { wrapper } = await render()
    vi.mocked(invoicesApi.close).mockResolvedValue({ ...invoice, status: 'CLOSED' })

    await buttonWithText(wrapper, 'Fechar fatura').trigger('click')
    await flushPromises()

    const dialog = wrapper.findComponent(CloseInvoiceDialog)
    expect(dialog.props()).toMatchObject({
      open: true,
      title: 'Fechar a fatura de Novembro, Visa Platinum?',
      purchases: 2,
      value: 500,
      dueDate: '2026-12-10',
      walletName: 'Conta corrente',
    })
    const loads = vi.mocked(invoicesApi.findById).mock.calls.length

    dialog.vm.$emit('confirm')
    await flushPromises()

    expect(invoicesApi.close).toHaveBeenCalledWith('i-1')
    expect(toast.success).toHaveBeenCalledWith('Fatura fechada', {
      description: 'Pagamento de fatura de 500,00 gerado, em aberto.',
      duration: 4000,
    })
    expect(vi.mocked(invoicesApi.findById).mock.calls.length).toBeGreaterThan(loads)
    expect(dialog.props('open')).toBe(false)
  })

  it('keeps the dialog open and shows why the close failed', async () => {
    const { wrapper } = await render()
    vi.mocked(invoicesApi.close).mockRejectedValue(problem(422))

    await buttonWithText(wrapper, 'Fechar fatura').trigger('click')
    await flushPromises()
    wrapper.findComponent(CloseInvoiceDialog).vm.$emit('confirm')
    await flushPromises()

    expect(wrapper.findComponent(CloseInvoiceDialog).props('open')).toBe(true)
    expect(wrapper.findComponent(CloseInvoiceDialog).props('messages')).toHaveLength(1)
    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(false)
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('closes the dialog without closing the invoice', async () => {
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Fechar fatura').trigger('click')
    await flushPromises()
    wrapper.findComponent(CloseInvoiceDialog).vm.$emit('close')
    await flushPromises()

    expect(wrapper.findComponent(CloseInvoiceDialog).props('open')).toBe(false)
    expect(invoicesApi.close).not.toHaveBeenCalled()
  })

  it('uses the due date of the server for a closed invoice, in the day and month', async () => {
    const { wrapper } = await render({ status: 'CLOSED', dueDate: '2026-12-10', payment })

    expect(wrapper.find('[data-slot="summary"]').text()).toContain('10/12')
  })

  it('shows the invoice payment bar and links to the payment of a closed invoice, which can be deleted to reopen', async () => {
    const { wrapper, router } = await render({ status: 'CLOSED', dueDate: '2026-12-10', payment })

    const bar = wrapper.find('[data-slot="payment-bar"]')
    expect(bar.text()).toContain('Pagamento de fatura: Pagamento de fatura, Visa Platinum')
    expect(bar.text()).toContain('500,00')
    expect(bar.text()).not.toContain('R$')
    const link = wrapper
      .findAll('a')
      .find((candidate) => candidate.text() === 'Ver pagamento de fatura')!
    expect(link.attributes('href')).toBe('/__movements.detail/m-1')

    vi.mocked(movementsApi.remove).mockResolvedValue(undefined)
    const dialog = useConfirmDialog()
    await buttonWithText(wrapper, 'Excluir pagamento de fatura').trigger('click')
    expect(dialog.state.options.title).toBe('Excluir o pagamento de fatura?')
    expect(dialog.state.options.description).toBe(
      'Excluir o pagamento reabre a fatura de Visa Platinum.',
    )
    expect(dialog.state.options.confirmLabel).toBe('Excluir e reabrir')
    dialog.accept()
    await flushPromises()

    expect(movementsApi.remove).toHaveBeenCalledWith('m-1')
    expect(toast.success).toHaveBeenCalledWith('Fatura reaberta', {
      description: 'O pagamento de fatura foi excluído.',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).not.toBe('movements.detail')
  })

  it('does not delete when the deletion is not confirmed', async () => {
    const { wrapper } = await render({ status: 'CLOSED', payment })

    await buttonWithText(wrapper, 'Excluir pagamento de fatura').trigger('click')
    useConfirmDialog().cancel()
    await flushPromises()

    expect(movementsApi.remove).not.toHaveBeenCalled()
  })

  it('offers only the link to the payment of a paid invoice', async () => {
    const { wrapper } = await render({ status: 'PAID', payment })

    expect(headerActions(wrapper)).toEqual(['Ver pagamento de fatura'])
    expect(wrapper.text()).toContain('Paga')
  })

  it('has no payment links when the invoice has no payment', async () => {
    const { wrapper } = await render({ status: 'CLOSED' })

    expect(wrapper.find('[data-slot="page-actions"]').text()).toBe('')
    expect(wrapper.find('[data-slot="payment-bar"]').exists()).toBe(false)
  })

  it('loads the other invoice when the id changes', async () => {
    const { wrapper } = await render()

    await wrapper.setProps({ id: 'i-2' })
    await flushPromises()

    expect(invoicesApi.findById).toHaveBeenLastCalledWith('i-2')
    expect(cardPurchasesApi.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ invoice: 'i-2' }),
    )
  })

  it('shows the server error when the invoice cannot be loaded', async () => {
    serve()
    vi.mocked(invoicesApi.findById).mockRejectedValue(problem(404))

    const { wrapper } = await mountView(InvoiceDetailView, 'invoices', { id: 'i-9' })

    expect(wrapper.find('h1').text()).toBe('Detalhando fatura')
    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'O recurso solicitado não existe',
    )
  })
})
