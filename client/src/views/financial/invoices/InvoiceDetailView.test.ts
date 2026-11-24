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
import { buttonWithText, mountView, pageOf, problem } from '@/test/crud'
import type {
  CardPurchaseListView,
  CardView,
  FinancialPeriodView,
  InvoiceView,
  MovementListView,
  MovementView,
} from '@/types'
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
  card: { id: 'c-1', name: 'Visa Platinum' },
  financialPeriod: { id: 'p-11', name: 'Novembro', status: 'OPEN', expired: false },
}

const purchases = [
  { id: 'cp-1', name: 'Mercado', purchasedOn: '2026-11-02', value: 300 },
  { id: 'cp-2', name: 'Posto', purchasedOn: '2026-11-04', value: 200 },
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
    name: 'Novembro',
    endingAt: '2026-11-30',
  } as FinancialPeriodView)
  vi.mocked(movementsApi.findAll).mockResolvedValue(pageOf([{ id: 'm-1' }] as MovementListView[]))
  vi.mocked(movementsApi.findById).mockResolvedValue({
    id: 'm-1',
    dueDate: '2026-12-10',
    invoice: { id: 'i-1' },
  } as MovementView)
}

async function render(content: Partial<InvoiceView> = {}, purchaseList = purchases) {
  serve(content, purchaseList)
  return mountView(InvoiceDetailView, 'invoices', { id: 'i-1' })
}

describe('InvoiceDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the open invoice with its total, its purchases and the way to close it', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Visa Platinum ••1234')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe('Novembro')
    expect(wrapper.text()).toContain('Aberta')
    const summary = wrapper.find('[data-slot="summary"]').text()
    expect(summary).toMatch(/R\$\s500,00/)
    expect(summary).toContain('2')
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    expect(wrapper.text()).toContain('Mercado')
    expect(buttonWithText(wrapper, 'Fechar fatura')).toBeDefined()
    expect(() => buttonWithText(wrapper, 'Excluir pagamento de fatura')).toThrow('no button')
    expect(movementsApi.findAll).not.toHaveBeenCalled()
  })

  it('offers a new purchase for the card and the period, and opens a purchase from its row', async () => {
    const { wrapper, router } = await render()

    const link = wrapper.findAll('a').find((candidate) => candidate.text() === 'Nova compra')!
    expect(link.attributes('href')).toBe(
      '/financial/invoices/purchases/create?card=c-1&period=p-11',
    )

    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/financial/invoices/purchases/cp-1/detail')
  })

  it('offers no new purchase once the invoice is closed', async () => {
    const { wrapper } = await render({ status: 'CLOSED' })

    expect(wrapper.findAll('a').some((candidate) => candidate.text() === 'Nova compra')).toBe(false)
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
      { id: 'cp-3', name: 'Padaria', purchasedOn: '2026-11-05', value: 20 } as CardPurchaseListView,
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

  it('says when there are no purchases', async () => {
    const { wrapper } = await render({ value: 0 }, [])

    expect(wrapper.find('[data-slot="no-purchases"]').exists()).toBe(true)
  })

  it('previews the close with the due date and the wallet, then closes and reloads', async () => {
    vi.mocked(invoicesApi.close).mockResolvedValue({ ...invoice, status: 'CLOSED' })
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Fechar fatura').trigger('click')
    await flushPromises()
    const dialog = wrapper.getComponent(CloseInvoiceDialog)
    expect(dialog.props()).toMatchObject({
      open: true,
      purchases: 2,
      value: 500,
      dueDate: '2026-12-10',
      walletName: 'Conta corrente',
    })

    dialog.vm.$emit('confirm')
    await flushPromises()

    expect(invoicesApi.close).toHaveBeenCalledWith('i-1')
    expect(toast.success).toHaveBeenCalledWith('Fatura fechada', expect.anything())
    expect(dialog.props('open')).toBe(false)
    expect(invoicesApi.findById).toHaveBeenCalledTimes(2)
  })

  it('keeps the dialog open and shows why the close failed', async () => {
    vi.mocked(invoicesApi.close).mockRejectedValue(problem(400, { error: 'inactive-wallet' }))
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Fechar fatura').trigger('click')
    const dialog = wrapper.getComponent(CloseInvoiceDialog)
    dialog.vm.$emit('confirm')
    await flushPromises()

    expect(dialog.props('open')).toBe(true)
    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
  })

  it('closes the dialog without closing the invoice', async () => {
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Fechar fatura').trigger('click')
    wrapper.getComponent(CloseInvoiceDialog).vm.$emit('close')
    await flushPromises()

    expect(wrapper.getComponent(CloseInvoiceDialog).props('open')).toBe(false)
    expect(invoicesApi.close).not.toHaveBeenCalled()
  })

  it('links to the invoice payment of a closed invoice and deletes it to reopen the invoice', async () => {
    vi.mocked(movementsApi.remove).mockResolvedValue(undefined)
    const { wrapper } = await render({ status: 'CLOSED' })

    expect(wrapper.find('a[href="/financial/movements/m-1/detail"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Fechada')
    expect(wrapper.findAll('a').some((link) => link.text() === 'Ver pagamento de fatura')).toBe(
      true,
    )

    await buttonWithText(wrapper, 'Excluir pagamento de fatura').trigger('click')
    expect(useConfirmDialog().state.options.confirmLabel).toBe('Excluir e reabrir')
    useConfirmDialog().accept()
    await flushPromises()

    expect(movementsApi.remove).toHaveBeenCalledWith('m-1')
    expect(toast.success).toHaveBeenCalledWith('Fatura reaberta', expect.anything())
  })

  it('does not delete when the deletion is not confirmed', async () => {
    const { wrapper } = await render({ status: 'CLOSED' })

    await buttonWithText(wrapper, 'Excluir pagamento de fatura').trigger('click')
    useConfirmDialog().cancel()
    await flushPromises()

    expect(movementsApi.remove).not.toHaveBeenCalled()
  })

  it('offers only the link to the payment of a paid invoice', async () => {
    const { wrapper } = await render({ status: 'PAID' })

    expect(wrapper.text()).toContain('Paga')
    expect(wrapper.findAll('a').some((link) => link.text() === 'Ver pagamento de fatura')).toBe(
      true,
    )
    expect(() => buttonWithText(wrapper, 'Excluir pagamento de fatura')).toThrow('no button')
  })

  it('has no payment links when the payment of the invoice cannot be found', async () => {
    serve({ status: 'CLOSED' })
    vi.mocked(movementsApi.findById).mockResolvedValue({ id: 'm-1', invoice: null } as MovementView)

    const { wrapper } = await mountView(InvoiceDetailView, 'invoices', { id: 'i-1' })

    expect(wrapper.findAll('a').some((link) => link.text() === 'Ver pagamento de fatura')).toBe(
      false,
    )
  })

  it('loads the other invoice when the id changes', async () => {
    const { wrapper } = await render()

    await wrapper.setProps({ id: 'i-2' })
    await flushPromises()

    expect(invoicesApi.findById).toHaveBeenLastCalledWith('i-2')
  })

  it('shows the server error when the invoice cannot be loaded', async () => {
    serve()
    vi.mocked(invoicesApi.findById).mockRejectedValue(problem(404))

    const { wrapper } = await mountView(InvoiceDetailView, 'invoices', { id: 'i-1' })

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
    expect(wrapper.find('h1').text()).toBe('Detalhando fatura')
  })
})
