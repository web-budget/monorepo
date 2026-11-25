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
  active: true,
  flag: 'Elo',
  wallet: {
    id: 'w-1',
    name: 'Main',
    type: 'BANK_ACCOUNT',
    bank: 'ACME',
    currentBalance: 0,
    agency: null,
    number: null,
    active: true,
  },
  invoicePaymentDay: 10,
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

  it('shows a card with its invoice day and wallet', async () => {
    const { wrapper } = await render()

    expect(cardsApi.findById).toHaveBeenCalledWith('k-1')
    expect(wrapper.find('h1').text()).toBe('Daily')
    expect(wrapper.find('[data-slot="page-description"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Ativo')
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual(['Identificação', 'Fatura'])
    expect(wrapper.text()).toContain('Main, ACME')
    expect(wrapper.text()).toContain('4321')
    expect(wrapper.text()).toContain('Elo')
  })

  it('shows a placeholder when the card has no wallet', async () => {
    const { wrapper } = await render({
      ...card,
      wallet: null,
    })

    expect(wrapper.text()).toContain('---')
    expect(wrapper.text()).toContain('10')
  })

  it('goes to the edit form', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Editar').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('cards.update')
  })

  it('asks first, naming the card, then removes it and goes to the listing', async () => {
    const { wrapper, router } = await render()
    vi.mocked(cardsApi.remove).mockResolvedValue(undefined)
    const dialog = useConfirmDialog()

    await buttonWithText(wrapper, 'Excluir').trigger('click')
    expect(dialog.state.options.title).toBe('Excluir o cartão “Daily”?')
    dialog.accept()
    await flushPromises()

    expect(cardsApi.remove).toHaveBeenCalledWith('k-1')
    expect(toast.success).toHaveBeenCalledWith('Cartão excluído', {
      description: '“Daily” saiu da lista.',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).toBe('cards')
  })

  it('does nothing when the removal is not confirmed', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Excluir').trigger('click')
    useConfirmDialog().cancel()
    await flushPromises()

    expect(cardsApi.remove).not.toHaveBeenCalled()
    expect(router.currentRoute.value.name).not.toBe('cards')
  })

  it('shows the server error when the removal fails', async () => {
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
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('shows the server error when the card cannot be loaded', async () => {
    vi.mocked(cardsApi.findById).mockRejectedValue(problem(404))

    const { wrapper } = await mountView(CardDetailView, 'cards', { id: 'k-9' })

    expect(wrapper.find('h1').text()).toBe('Detalhando')
    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'O recurso solicitado não existe',
    )
  })
})
