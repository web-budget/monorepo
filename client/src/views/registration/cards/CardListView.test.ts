import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { cardsApi } from '@/api/cards'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import {
  buttonWithText,
  chooseRowAction,
  listingCalls,
  mountView,
  namedTestRoutes,
  problem,
  serveListing,
  stateOf,
} from '@/test/crud'
import type { CardListView as CardRow } from '@/types'
import CardListView from '@/views/registration/cards/CardListView.vue'

vi.mock('@/api/cards')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const wallet = {
  id: 'w-1',
  name: 'Conta corrente',
  type: 'BANK_ACCOUNT',
  currentBalance: 0,
  bank: null,
  agency: null,
  number: null,
  active: true,
} as const

const cards: CardRow[] = [
  {
    id: 'k-1',
    name: 'Travel',
    lastFourDigits: '4321',
    invoicePaymentDay: 10,
    active: true,
    flag: 'Visa',
    wallet,
  },
  {
    id: 'k-2',
    name: 'Daily',
    lastFourDigits: '1177',
    invoicePaymentDay: 5,
    active: false,
    flag: null,
    wallet: null,
  },
]

async function render(content = cards, counts?: Record<string, number>) {
  serveListing(vi.mocked(cardsApi.findAll), content, content.length, counts)
  return mountView(CardListView, 'cards', {}, {}, undefined, namedTestRoutes('invoices'))
}

describe('CardListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('introduces the page and offers the active cards first, with the counts', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Cartões')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe('Cartões de crédito.')
    expect(wrapper.find('[data-slot="page-actions"]').text()).toBe('Criar')
    expect(wrapper.find('input').attributes('placeholder')).toBe(
      'Nome, final, bandeira ou carteira',
    )
    expect(wrapper.findAll('[aria-pressed]').map((button) => button.text())).toEqual([
      'Ativos 4',
      'Inativos 1',
      'Todos 5',
    ])
  })

  it('shows the name, the last digits, the flag, the payment day, the wallet and the status', async () => {
    const { wrapper } = await render()

    expect(wrapper.findAll('thead th').map((header) => header.text())).toEqual([
      'Nome',
      'Final',
      'Bandeira',
      'Dia do pagamento da fatura',
      'Carteira que paga a fatura',
      'Situação',
      'Ações',
    ])
    const rows = wrapper.findAll('tbody tr')
    expect(rows[0]!.findAll('td').map((cell) => cell.text())).toEqual([
      'Travel',
      '••4321',
      'Visa',
      '10',
      'Conta corrente',
      'Ativo',
      '',
    ])
    expect(rows[1]!.findAll('td').map((cell) => cell.text())).toEqual([
      'Daily',
      '••1177',
      '',
      '5',
      '',
      'Inativo',
      '',
    ])
  })

  it('labels the footer with the noun and counts the cards that match the search', async () => {
    const { wrapper } = await render()

    expect(wrapper.text()).toContain('1–2 de 2 cartões')
    await wrapper.find('input').setValue('Vis')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(wrapper.text()).toContain('2 cartões encontrados para “Vis”')
    const counted = vi
      .mocked(cardsApi.findAll)
      .mock.calls.filter(([query]) => query.size === 1)
      .slice(-3)
    expect(counted.map(([query]) => query.filter)).toEqual(['Vis', 'Vis', 'Vis'])
  })

  it('loads the active cards and lists them', async () => {
    const { wrapper } = await render()

    expect(cardsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', sort: 'createdOn,desc' }),
    )
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.find('a').attributes('href')).toBe('/cards/k-1/detail')
  })

  it('searches by the typed filter, filters by status and sorts by the payment day', async () => {
    const { wrapper } = await render()

    await wrapper.find('input').setValue('Vis')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(listingCalls(vi.mocked(cardsApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ filter: 'Vis', page: 0 }),
    )

    await buttonWithText(wrapper, 'Todos').trigger('click')
    await flushPromises()
    expect(listingCalls(vi.mocked(cardsApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ status: 'ALL' }),
    )

    await buttonWithText(wrapper, 'Dia do pagamento da fatura').trigger('click')
    await flushPromises()
    expect(listingCalls(vi.mocked(cardsApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ sort: 'invoicePaymentDay,asc' }),
    )
  })

  it('clears the search and reloads', async () => {
    const { wrapper } = await render()

    await wrapper.find('input').setValue('abc')
    await wrapper.find('button[aria-label="Limpar filtro"]').trigger('click')
    await flushPromises()

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
    expect(listingCalls(vi.mocked(cardsApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ filter: '' }),
    )
  })

  it('navigates to the form, the detail, the edit form and the invoices of the card', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Criar').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('cards.create')

    await chooseRowAction(wrapper, 1, 'Editar')
    expect(router.currentRoute.value.name).toBe('cards.update')
    expect(router.currentRoute.value.params.id).toBe('k-2')

    await chooseRowAction(wrapper, 0, 'Ver faturas')
    expect(router.currentRoute.value.name).toBe('invoices')
    expect(router.currentRoute.value.query.card).toBe('k-1')

    await wrapper.findAll('tbody tr')[0]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('cards.detail')
    expect(router.currentRoute.value.params.id).toBe('k-1')
  })

  it('removes a card after confirmation, naming it', async () => {
    const { wrapper } = await render()
    vi.mocked(cardsApi.remove).mockResolvedValue(undefined)
    const dialog = useConfirmDialog()

    await chooseRowAction(wrapper, 0, 'Excluir')
    expect(dialog.state.options.title).toBe('Excluir o cartão “Travel”?')
    dialog.accept()
    await flushPromises()

    expect(cardsApi.remove).toHaveBeenCalledWith('k-1')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(toast.success).toHaveBeenCalledWith('Cartão excluído', {
      description: '“Travel” saiu da lista.',
      duration: 4000,
    })
  })

  it('keeps the card when the removal is not confirmed', async () => {
    const { wrapper } = await render()

    await chooseRowAction(wrapper, 0, 'Excluir')
    useConfirmDialog().cancel()
    await flushPromises()

    expect(cardsApi.remove).not.toHaveBeenCalled()
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('shows the server error when the removal fails', async () => {
    const { wrapper } = await render()
    vi.mocked(cardsApi.remove).mockRejectedValue(
      problem(400, { error: 'data-integrity-violation' }),
    )

    await chooseRowAction(wrapper, 0, 'Excluir')
    useConfirmDialog().accept()
    await flushPromises()

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'vinculado a outros registros',
    )
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('invites the user to register the first card when none exists', async () => {
    const { wrapper, router } = await render([], { ACTIVE: 0, INACTIVE: 0, ALL: 0 })

    const state = wrapper.find('[data-state="empty"]')
    expect(state.text()).toContain('Nenhum cartão cadastrado')
    expect(state.text()).toContain('Cadastre o primeiro cartão.')
    expect(state.find('button').text()).toBe('Criar')

    await state.find('button').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('cards.create')
  })

  it('says nothing matched the search, and shows the error state with a retry', async () => {
    const { wrapper } = await render([])
    await wrapper.find('input').setValue('zzz')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    const noResult = wrapper.find('[data-state="no-result"]')
    expect(noResult.text()).toContain('Nenhum cartão encontrado para “zzz”')
    expect(noResult.text()).toContain('Mude os filtros ou limpe a busca.')

    await noResult.find('button').trigger('click')
    await flushPromises()
    expect(listingCalls(vi.mocked(cardsApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ filter: '' }),
    )

    vi.mocked(cardsApi.findAll).mockRejectedValue(problem(500))
    await wrapper.find('input').setValue('zzz')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    const error = wrapper.find('[data-state="error"]')
    expect(error.text()).toContain('Não foi possível carregar os cartões')
    expect(error.text()).toContain('O servidor não respondeu. Seus filtros continuam na URL.')

    serveListing(vi.mocked(cardsApi.findAll), cards)
    await error.find('button').trigger('click')
    await flushPromises()
    expect(stateOf(wrapper)).toBeUndefined()
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('says no card has the chosen status when only the status narrows the list', async () => {
    const { wrapper } = await render([], { ACTIVE: 0, INACTIVE: 0, ALL: 2 })

    expect(wrapper.find('[data-state="no-result"]').text()).toContain(
      'Nenhum cartão com esses filtros',
    )
  })

  it('opens with the state of the URL, which stays there', async () => {
    const location = '/cards?filter=Ab&status=INACTIVE&page=2&size=30&sort=invoicePaymentDay,asc'
    serveListing(vi.mocked(cardsApi.findAll), cards, 70)

    const { router } = await mountView(CardListView, 'cards', {}, {}, location)

    expect(listingCalls(vi.mocked(cardsApi.findAll))[0]).toEqual({
      filter: 'Ab',
      status: 'INACTIVE',
      page: 1,
      size: 30,
      sort: 'invoicePaymentDay,asc',
    })
    expect(router.currentRoute.value.fullPath).toBe(location)
  })
})
