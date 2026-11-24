import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { cardPurchasesApi } from '@/api/cardPurchases'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, namedTestRoutes, problem } from '@/test/crud'
import type { CardPurchaseView } from '@/types'
import CardPurchaseDetailView from '@/views/financial/invoices/CardPurchaseDetailView.vue'

vi.mock('@/api/cardPurchases')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const purchase: CardPurchaseView = {
  id: 'cp-1',
  name: 'Mercado',
  purchasedOn: '2026-11-02',
  value: 300,
  card: { id: 'c-1', name: 'Visa Platinum', lastFourDigits: '4821' },
  invoice: { id: 'i-1', status: 'OPEN' },
  financialPeriod: { id: 'p-11', name: 'Novembro de 2026', status: 'OPEN', expired: false },
  classification: { id: 'cl-1', name: 'Mercado', type: 'EXPENSE' },
  costCenter: { id: 'cc-1', name: 'Casa', fullName: 'Casa' },
  movement: null,
}

async function render(content: Partial<CardPurchaseView> = {}) {
  vi.mocked(cardPurchasesApi.findById).mockResolvedValue({ ...purchase, ...content })
  return mountView(
    CardPurchaseDetailView,
    'purchases',
    { id: 'cp-1' },
    {},
    undefined,
    namedTestRoutes('invoices.detail', 'movements.detail'),
  )
}

function footerActions(wrapper: Awaited<ReturnType<typeof render>>['wrapper']) {
  return wrapper
    .find('[data-slot="detail-footer"]')
    .findAll('a, button')
    .map((action) => action.text())
}

describe('CardPurchaseDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the purchase in one section, with the invoice by card and period and no status badge', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Mercado')
    expect(wrapper.find('[data-slot="badge"]').exists()).toBe(false)
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual(['Compra'])
    expect(wrapper.findAll('dt').map((label) => label.text())).toEqual([
      'Nome',
      'Data',
      'Valor',
      'Centro de custo',
      'Classificação',
      'Fatura',
    ])
    const values = wrapper.findAll('dd').map((value) => value.text())
    expect(values).toHaveLength(6)
    expect(values[0]).toBe('Mercado')
    expect(values[1]).toBe('02/11/2026')
    expect(values[2]).toMatch(/^R\$\s300,00$/)
    expect(values.slice(3)).toEqual(['Casa', 'Mercado', 'Visa Platinum, Novembro de 2026'])
    expect(wrapper.find('[data-slot="movement-notice"]').exists()).toBe(false)
  })

  it('has no actions in the header: the footer links to the invoice and, while it is open, edits and deletes', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('[data-slot="page-actions"]').exists()).toBe(false)
    expect(footerActions(wrapper)).toEqual(['Ver fatura', 'Editar', 'Excluir'])
    expect(wrapper.find('[data-slot="detail-footer"] a').attributes('href')).toBe(
      '/__invoices.detail/i-1',
    )
  })

  it('still edits and deletes when the server leaves the movement out of the payload', async () => {
    const { wrapper } = await render({ movement: undefined })

    expect(footerActions(wrapper)).toEqual(['Ver fatura', 'Editar', 'Excluir'])
  })

  it('goes to the edit form', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Editar').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('purchases.update')
  })

  it('asks first, then removes the purchase and goes back to the invoices', async () => {
    vi.mocked(cardPurchasesApi.remove).mockResolvedValue(undefined)
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Excluir').trigger('click')
    expect(useConfirmDialog().state.options.title).toBe('Excluir a compra “Mercado”?')
    useConfirmDialog().accept()
    await flushPromises()

    expect(cardPurchasesApi.remove).toHaveBeenCalledWith('cp-1')
    expect(toast.success).toHaveBeenCalledWith('Compra excluída', expect.anything())
    expect(router.currentRoute.value.name).toBe('purchases')
  })

  it('only links to the invoice when it is no longer open', async () => {
    const { wrapper } = await render({ invoice: { id: 'i-1', status: 'CLOSED' } })

    expect(footerActions(wrapper)).toEqual(['Ver fatura'])
  })

  it('only links to the invoice and to the movement when the purchase came from a payment', async () => {
    const { wrapper } = await render({ movement: 'm-1' })

    expect(wrapper.find('[data-slot="movement-notice"]').text()).toContain('pagamento no cartão')
    expect(wrapper.find('[data-slot="movement-notice"] a').attributes('href')).toBe(
      '/__movements.detail/m-1',
    )
    expect(footerActions(wrapper)).toEqual(['Ver fatura'])
  })

  it('shows the server error when the purchase cannot be loaded', async () => {
    vi.mocked(cardPurchasesApi.findById).mockRejectedValue(problem(404))

    const { wrapper } = await mountView(CardPurchaseDetailView, 'purchases', { id: 'cp-1' })

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
    expect(wrapper.find('h1').text()).toBe('Detalhando')
    expect(wrapper.find('[data-slot="detail-footer"]').exists()).toBe(false)
  })
})
