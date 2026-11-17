import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { cardsApi } from '@/api/cards'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, problem } from '@/test/crud'
import type { CardView } from '@/types'
import CardDetailView from '@/views/registration/cards/CardDetailView.vue'

vi.mock('@/api/cards')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const card: CardView = {
  id: 'k-1',
  name: 'Daily',
  lastFourDigits: '4321',
  type: 'DEBIT',
  active: true,
  flag: 'Elo',
  wallet: { id: 'w-1', name: 'Main', type: 'BANK_ACCOUNT', bank: 'ACME', active: true },
  invoicePaymentDay: null,
}

async function render(view: CardView = card) {
  vi.mocked(cardsApi.findById).mockResolvedValue(view)
  return mountView(CardDetailView, 'cards', { id: 'k-1' })
}

describe('CardDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the card with its wallet', async () => {
    const { wrapper } = await render()

    expect(cardsApi.findById).toHaveBeenCalledWith('k-1')
    expect(wrapper.text()).toContain('Detalhando cartão')
    expect(wrapper.text()).toContain('Ativo')
    expect(wrapper.text()).toContain('Daily')
    expect(wrapper.text()).toContain('Débito')
    expect(wrapper.text()).toContain('Main')
    expect(wrapper.text()).toContain('4321')
    expect(wrapper.text()).toContain('Elo')
  })

  it('shows the invoice day of a credit card and a placeholder without wallet', async () => {
    const { wrapper } = await render({
      ...card,
      type: 'CREDIT',
      wallet: null,
      invoicePaymentDay: 10,
    })

    expect(wrapper.text()).toContain('Crédito')
    expect(wrapper.text()).toContain('10')
    expect(wrapper.text()).toContain('---')
  })

  it('goes to the listing and to the edit form', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Editar').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('cards.update')

    await buttonWithText(wrapper, 'Voltar').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('cards')
  })

  it('deletes after confirmation and goes to the listing', async () => {
    const { wrapper, router } = await render()
    vi.mocked(cardsApi.remove).mockResolvedValue(undefined)

    await buttonWithText(wrapper, 'Excluir').trigger('click')
    useConfirmDialog().accept()
    await flushPromises()

    expect(cardsApi.remove).toHaveBeenCalledWith('k-1')
    expect(toast.success).toHaveBeenCalledWith('Registro excluído', {
      description: 'Cartão excluído com sucesso',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).toBe('cards')
  })

  it('shows the server error when the deletion fails', async () => {
    const { wrapper } = await render()
    vi.mocked(cardsApi.remove).mockRejectedValue(
      problem(400, { error: 'data-integrity-violation' }),
    )

    await buttonWithText(wrapper, 'Excluir').trigger('click')
    useConfirmDialog().accept()
    await flushPromises()

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'vinculado a outros registros',
    )
  })

  it('shows the server error when the card cannot be loaded', async () => {
    vi.mocked(cardsApi.findById).mockRejectedValue(problem(404))

    const { wrapper } = await mountView(CardDetailView, 'cards', { id: 'x' })

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'O recurso solicitado não existe',
    )
  })
})
