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

const cards: CardRow[] = [
  { id: 'k-1', name: 'Travel', type: 'CREDIT', active: true, flag: 'Visa' },
  { id: 'k-2', name: 'Daily', type: 'DEBIT', active: true, flag: null },
]

async function render(content = cards, counts?: Record<string, number>) {
  serveListing(vi.mocked(cardsApi.findAll), content, content.length, counts)
  return mountView(CardListView, 'cards')
}

describe('CardListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('introduces the page and offers the active cards first, with the counts', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Cartões')
    expect(wrapper.find('[data-slot="page-actions"]').text()).toBe('Criar')
    expect(wrapper.findAll('[aria-pressed]').map((button) => button.text())).toEqual([
      'Ativos 4',
      'Inativos 1',
      'Todos 5',
    ])
  })

  it('labels the status of a card in the masculine', async () => {
    const { wrapper } = await render()

    expect(wrapper.findAll('tbody [data-slot="badge"]').map((badge) => badge.text())).toEqual([
      'Ativo',
      'Ativo',
    ])
  })

  it('loads the active cards and lists them with the translated type', async () => {
    const { wrapper } = await render()

    expect(cardsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', sort: 'createdOn,desc' }),
    )
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('Travel')
    expect(rows[0]!.text()).toContain('Visa')
    expect(rows[0]!.text()).toContain('Crédito')
    expect(rows[1]!.text()).toContain('Débito')
    expect(rows[0]!.find('a').attributes('href')).toBe('/cards/k-1/detail')
  })

  it('searches by the typed filter, filters by status and sorts by the flag', async () => {
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

    await buttonWithText(wrapper, 'Bandeira').trigger('click')
    await flushPromises()
    expect(listingCalls(vi.mocked(cardsApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ sort: 'flag,asc' }),
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

  it('navigates to the form, the detail and the edit form', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Criar').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('cards.create')

    await chooseRowAction(wrapper, 1, 'Editar')
    expect(router.currentRoute.value.name).toBe('cards.update')
    expect(router.currentRoute.value.params.id).toBe('k-2')

    await wrapper.findAll('tbody tr')[0]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('cards.detail')
    expect(router.currentRoute.value.params.id).toBe('k-1')
  })

  it('removes a card after confirmation, naming it', async () => {
    const { wrapper } = await render()
    vi.mocked(cardsApi.remove).mockResolvedValue(undefined)
    const dialog = useConfirmDialog()

    await chooseRowAction(wrapper, 0, 'Remover')
    expect(dialog.state.options.title).toBe('Remover o cartão “Travel”?')
    dialog.accept()
    await flushPromises()

    expect(cardsApi.remove).toHaveBeenCalledWith('k-1')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(toast.success).toHaveBeenCalledWith('Cartão removido', {
      description: '“Travel” saiu da lista.',
      duration: 4000,
    })
  })

  it('keeps the card when the removal is not confirmed', async () => {
    const { wrapper } = await render()

    await chooseRowAction(wrapper, 0, 'Remover')
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

    await chooseRowAction(wrapper, 0, 'Remover')
    useConfirmDialog().accept()
    await flushPromises()

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'vinculado a outros registros',
    )
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('invites the user to create the first card when none exists', async () => {
    const { wrapper, router } = await render([], { ACTIVE: 0, INACTIVE: 0, ALL: 0 })

    expect(wrapper.find('[data-state="empty"]').text()).toContain('Nenhum cartão ainda')

    await wrapper.find('[data-state="empty"] button').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('cards.create')
  })

  it('says nothing matched the search, and shows the error state with a retry', async () => {
    const { wrapper } = await render([])
    await wrapper.find('input').setValue('zzz')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(wrapper.find('[data-state="no-result"]').text()).toContain('Nada encontrado para “zzz”')

    await wrapper.find('[data-state="no-result"] button').trigger('click')
    await flushPromises()
    expect(listingCalls(vi.mocked(cardsApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ filter: '' }),
    )

    vi.mocked(cardsApi.findAll).mockRejectedValue(problem(500))
    await wrapper.find('input').setValue('zzz')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(wrapper.find('[data-state="error"]').text()).toContain(
      'Não foi possível carregar os cartões',
    )

    serveListing(vi.mocked(cardsApi.findAll), cards)
    await wrapper.find('[data-state="error"] button').trigger('click')
    await flushPromises()
    expect(stateOf(wrapper)).toBeUndefined()
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('opens with the state of the URL, which stays there', async () => {
    const location = '/cards?filter=Ab&status=INACTIVE&page=2&size=30&sort=flag,asc'
    serveListing(vi.mocked(cardsApi.findAll), cards, 70)

    const { router } = await mountView(CardListView, 'cards', {}, {}, location)

    expect(listingCalls(vi.mocked(cardsApi.findAll))[0]).toEqual({
      filter: 'Ab',
      status: 'INACTIVE',
      page: 1,
      size: 30,
      sort: 'flag,asc',
    })
    expect(router.currentRoute.value.fullPath).toBe(location)
  })
})
