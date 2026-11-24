import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { cardPurchasesApi } from '@/api/cardPurchases'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, problem } from '@/test/crud'
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
  card: { id: 'c-1', name: 'Visa Platinum' },
  invoice: { id: 'i-1', status: 'OPEN' },
  financialPeriod: { id: 'p-11', name: 'Novembro', status: 'OPEN', expired: false },
  classification: { id: 'cl-1', name: 'Mercado', type: 'EXPENSE' },
  costCenter: { id: 'cc-1', name: 'Casa', fullName: 'Casa' },
  movement: null,
}

async function render(content: Partial<CardPurchaseView> = {}) {
  vi.mocked(cardPurchasesApi.findById).mockResolvedValue({ ...purchase, ...content })
  return mountView(CardPurchaseDetailView, 'purchases', { id: 'cp-1' })
}

describe('CardPurchaseDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the purchase with its invoice, its classification and the way to change it', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Mercado')
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual(['Compra', 'Classificação'])
    expect(wrapper.text()).toMatch(/R\$\s300,00/)
    expect(wrapper.text()).toContain('02/11/2026')
    expect(wrapper.text()).toContain('Visa Platinum')
    expect(wrapper.text()).toContain('Aberta')
    expect(wrapper.text()).toContain('Casa')
    expect(wrapper.find('a[href="/financial/invoices/i-1/detail"]').text()).toBe(
      'Fatura de Novembro',
    )
    expect(buttonWithText(wrapper, 'Editar')).toBeDefined()
    expect(buttonWithText(wrapper, 'Excluir')).toBeDefined()
    expect(wrapper.find('[data-slot="movement-notice"]').exists()).toBe(false)
  })

  it('goes to the edit form', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Editar').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('purchases.update')
  })

  it('asks first, then removes the purchase and goes back to the invoices', async () => {
    vi.mocked(cardPurchasesApi.remove).mockResolvedValue(undefined)
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Excluir').trigger('click')
    expect(useConfirmDialog().state.options.title).toBe('Excluir a compra “Mercado”?')
    useConfirmDialog().accept()
    await flushPromises()

    expect(cardPurchasesApi.remove).toHaveBeenCalledWith('cp-1')
    expect(toast.success).toHaveBeenCalledWith('Compra excluída', expect.anything())
  })

  it('is read only when the invoice is no longer open', async () => {
    const { wrapper } = await render({ invoice: { id: 'i-1', status: 'CLOSED' } })

    expect(wrapper.text()).toContain('Fechada')
    expect(() => buttonWithText(wrapper, 'Editar')).toThrow('no button')
    expect(() => buttonWithText(wrapper, 'Excluir')).toThrow('no button')
  })

  it('is read only and links to the movement when the purchase came from a payment', async () => {
    const { wrapper } = await render({ movement: 'm-1' })

    expect(wrapper.find('[data-slot="movement-notice"]').text()).toContain('pagamento no cartão')
    expect(wrapper.find('a[href="/financial/movements/m-1/detail"]').exists()).toBe(true)
    expect(() => buttonWithText(wrapper, 'Editar')).toThrow('no button')
  })

  it('shows the server error when the purchase cannot be loaded', async () => {
    vi.mocked(cardPurchasesApi.findById).mockRejectedValue(problem(404))

    const { wrapper } = await mountView(CardPurchaseDetailView, 'purchases', { id: 'cp-1' })

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
    expect(wrapper.find('h1').text()).toBe('Detalhando compra')
  })
})
