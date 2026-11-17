import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { cardsApi } from '@/api/cards'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, pageOf, problem } from '@/test/crud'
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

async function render() {
  vi.mocked(cardsApi.findAll).mockResolvedValue(pageOf(cards))
  return mountView(CardListView, 'cards')
}

describe('CardListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('loads the active cards and lists them with the translated type', async () => {
    const { wrapper } = await render()

    expect(cardsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', sort: 'createdOn,asc' }),
    )
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('Travel')
    expect(rows[0]!.text()).toContain('Visa')
    expect(rows[0]!.text()).toContain('Crédito')
    expect(rows[1]!.text()).toContain('Débito')
  })

  it('searches by the typed filter and sorts by the flag', async () => {
    const { wrapper } = await render()

    await wrapper.find('input').setValue('Vis')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(cardsApi.findAll).toHaveBeenLastCalledWith(expect.objectContaining({ filter: 'Vis' }))

    await buttonWithText(wrapper, 'Bandeira').trigger('click')
    await flushPromises()
    expect(cardsApi.findAll).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'flag,asc' }))
  })

  it('clears the filter and reloads', async () => {
    const { wrapper } = await render()

    await wrapper.find('input').setValue('abc')
    await wrapper.find('button[aria-label="Limpar filtro"]').trigger('click')
    await flushPromises()

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
  })

  it('navigates to the form, the detail and the edit form', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Novo').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('cards.create')

    await wrapper.findAll('button[aria-label="Editar"]')[1]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('cards.update')
    expect(router.currentRoute.value.params.id).toBe('k-2')

    await wrapper.findAll('tbody tr')[0]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('cards.detail')
    expect(router.currentRoute.value.params.id).toBe('k-1')
  })

  it('deletes a card after confirmation', async () => {
    const { wrapper } = await render()
    vi.mocked(cardsApi.remove).mockResolvedValue(undefined)

    await wrapper.findAll('button[aria-label="Deletar"]')[0]!.trigger('click')
    useConfirmDialog().accept()
    await flushPromises()

    expect(cardsApi.remove).toHaveBeenCalledWith('k-1')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(toast.success).toHaveBeenCalledWith('Registro excluído', {
      description: 'Cartão excluído com sucesso',
      duration: 4000,
    })
  })

  it('keeps the card when the deletion is not confirmed', async () => {
    const { wrapper } = await render()

    await wrapper.findAll('button[aria-label="Deletar"]')[0]!.trigger('click')
    useConfirmDialog().cancel()
    await flushPromises()

    expect(cardsApi.remove).not.toHaveBeenCalled()
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('shows the server error when the deletion fails', async () => {
    const { wrapper } = await render()
    vi.mocked(cardsApi.remove).mockRejectedValue(
      problem(400, { error: 'data-integrity-violation' }),
    )

    await wrapper.findAll('button[aria-label="Deletar"]')[0]!.trigger('click')
    useConfirmDialog().accept()
    await flushPromises()

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'vinculado a outros registros',
    )
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })
})
