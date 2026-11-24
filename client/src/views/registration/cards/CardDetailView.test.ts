import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cardsApi } from '@/api/cards'
import { buttonWithText, mountView, namedTestRoutes, problem } from '@/test/crud'
import type { CardView } from '@/types'
import CardDetailView from '@/views/registration/cards/CardDetailView.vue'

vi.mock('@/api/cards')

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
  return mountView(
    CardDetailView,
    'cards',
    { id: 'k-1' },
    {},
    undefined,
    namedTestRoutes('invoices'),
  )
}

describe('CardDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows a card with its flag, last digits, payment day and wallet', async () => {
    const { wrapper } = await render()

    expect(cardsApi.findById).toHaveBeenCalledWith('k-1')
    expect(wrapper.find('h1').text()).toBe('Daily')
    expect(wrapper.find('[data-slot="page-description"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Ativo')
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual(['Identificação', 'Fatura'])
    expect(wrapper.findAll('dt').map((label) => label.text())).toEqual([
      'Nome',
      'Bandeira',
      'Final',
      'Dia do pagamento',
      'Carteira que paga',
    ])
    expect(wrapper.findAll('dd').map((value) => value.text())).toEqual([
      'Daily',
      'Elo',
      '••4321',
      '10',
      'Main',
    ])
  })

  it('shows a placeholder when the card has no wallet', async () => {
    const { wrapper } = await render({
      ...card,
      wallet: null,
    })

    expect(wrapper.text()).toContain('---')
    expect(wrapper.text()).toContain('10')
  })

  it('has no actions in the header: the footer offers the invoices and the edit form', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('[data-slot="page-actions"]').exists()).toBe(false)
    expect(
      wrapper
        .find('[data-slot="detail-footer"]')
        .findAll('button')
        .map((button) => button.text()),
    ).toEqual(['Ver faturas', 'Editar'])
  })

  it('goes to the edit form', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Editar').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('cards.update')
  })

  it('goes to the invoices of the card', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Ver faturas').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('invoices')
    expect(router.currentRoute.value.query.card).toBe('k-1')
  })

  it('shows the server error when the card cannot be loaded', async () => {
    vi.mocked(cardsApi.findById).mockRejectedValue(problem(404))

    const { wrapper } = await mountView(CardDetailView, 'cards', { id: 'k-9' })

    expect(wrapper.find('h1').text()).toBe('Detalhando')
    expect(wrapper.find('[data-slot="detail-footer"]').exists()).toBe(false)
    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'O recurso solicitado não existe',
    )
  })
})
