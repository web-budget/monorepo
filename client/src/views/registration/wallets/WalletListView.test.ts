import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { walletsApi } from '@/api/wallets'
import { Select } from '@/components/ui/select'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import {
  buttonWithText,
  chooseRowAction,
  mountView,
  pageOf,
  problem,
  useCompactViewport,
} from '@/test/crud'
import type { PageQuery, WalletListView } from '@/types'
import WalletListView_ from '@/views/registration/wallets/WalletListView.vue'

vi.mock('@/api/wallets')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const wallets: WalletListView[] = [
  { id: 'w-1', name: 'Main', type: 'BANK_ACCOUNT', bank: 'ACME', active: true },
  { id: 'w-2', name: 'Cash', type: 'PERSONAL', bank: 'Ignored', active: false },
]

const COUNTS: Record<string, number> = { ACTIVE: 4, INACTIVE: 1, ALL: 5 }

function serve(content = wallets, total = content.length, counts = COUNTS) {
  vi.mocked(walletsApi.findAll).mockImplementation((query: PageQuery) =>
    Promise.resolve(
      query.size === 1 ? pageOf([], counts[query.status ?? 'ALL']) : pageOf(content, total),
    ),
  )
}

async function render(content = wallets, total = content.length, counts = COUNTS) {
  serve(content, total, counts)
  return mountView(WalletListView_, 'wallets')
}

function stateOf(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper']) {
  return ['empty', 'no-result', 'error'].find((kind) =>
    wrapper.find(`[data-state="${kind}"]`).exists(),
  )
}

function listing() {
  return vi.mocked(walletsApi.findAll).mock.calls.filter(([query]) => query.size !== 1)
}

describe('WalletListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  afterEach(() => {
    useCompactViewport(false)
  })

  it('introduces the page with a title, a description and the action to create', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Carteiras')
    expect(wrapper.find('[data-slot="page-description"]').text()).toContain('Contas bancárias')
    expect(wrapper.find('[data-slot="page-actions"]').text()).toBe('Nova carteira')
  })

  it('loads the active wallets on mount and lists them', async () => {
    const { wrapper } = await render()

    expect(walletsApi.findAll).toHaveBeenCalledWith({
      filter: '',
      status: 'ACTIVE',
      page: 0,
      size: 15,
      sort: 'createdOn,desc',
    })
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('Main')
    expect(rows[0]!.text()).toContain('ACME')
    expect(rows[0]!.text()).toContain('Conta Bancária')
    expect(rows[1]!.text()).toContain('Cash')
    expect(rows[1]!.text()).toContain('---')
    expect(rows[1]!.text()).not.toContain('Ignored')
    expect(rows[1]!.text()).toContain('Pessoal')
  })

  it('offers the statuses with the active ones first, each with its count', async () => {
    const { wrapper } = await render()

    expect(wrapper.findAll('[aria-pressed]').map((button) => button.text())).toEqual([
      'Ativas 4',
      'Inativas 1',
      'Todas 5',
    ])
    expect(buttonWithText(wrapper, 'Ativas').attributes('aria-pressed')).toBe('true')
    expect(walletsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'INACTIVE', size: 1, filter: '' }),
    )
  })

  it('shows a skeleton while the first load is under way', async () => {
    vi.mocked(walletsApi.findAll).mockReturnValue(new Promise(() => undefined))

    const { wrapper } = await mountView(WalletListView_, 'wallets')

    expect(wrapper.findAll('[aria-label="Carregando..."]')).toHaveLength(3)
    expect(stateOf(wrapper)).toBeUndefined()
  })

  it('searches by the typed filter, from the first page', async () => {
    const { wrapper } = await render(wallets, 40)
    await buttonWithText(wrapper, '2').trigger('click')
    await flushPromises()

    await wrapper.find('input').setValue('Mai')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(listing().slice(-1)[0]![0]).toEqual(expect.objectContaining({ filter: 'Mai', page: 0 }))
  })

  it('says how many wallets were found for the applied search, in plural and singular', async () => {
    const { wrapper } = await render(wallets, 2)
    expect(wrapper.text()).toContain('1–2 de 2')

    await wrapper.find('input').setValue('Ma')
    expect(wrapper.text()).toContain('1–2 de 2')

    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(wrapper.text()).toContain('2 carteiras encontradas para “Ma”')
    expect(wrapper.text()).not.toContain('1–2 de 2')

    serve([wallets[0]!], 1)
    await wrapper.find('input').setValue('Main')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(wrapper.text()).toContain('1 carteira encontrada para “Main”')
  })

  it('goes back to the range when the search is cleared', async () => {
    const { wrapper } = await render(wallets, 2)
    await wrapper.find('input').setValue('Ma')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    await wrapper.find('button[aria-label="Limpar filtro"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('1–2 de 2')
    expect(wrapper.text()).not.toContain('encontradas')
  })

  it('filters by status from the first page', async () => {
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Todas').trigger('click')
    await flushPromises()

    expect(listing().slice(-1)[0]![0]).toEqual(expect.objectContaining({ status: 'ALL', page: 0 }))
  })

  it('clears the text of the search and keeps the status', async () => {
    const { wrapper } = await render()
    await buttonWithText(wrapper, 'Todas').trigger('click')
    await wrapper.find('input').setValue('Mai')

    await wrapper.find('button[aria-label="Limpar filtro"]').trigger('click')
    await flushPromises()

    expect(listing().slice(-1)[0]![0]).toEqual(
      expect.objectContaining({ filter: '', status: 'ALL' }),
    )
  })

  it('sorts by a column', async () => {
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Nome').trigger('click')
    await flushPromises()
    await buttonWithText(wrapper, 'Nome').trigger('click')
    await flushPromises()

    expect(listing().slice(-1)[0]![0]).toEqual(expect.objectContaining({ sort: 'name,desc' }))
  })

  it('sorts by name in both directions and goes back to the newest first', async () => {
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Nome').trigger('click')
    await flushPromises()
    expect(listing().slice(-1)[0]![0]).toEqual(expect.objectContaining({ sort: 'name,asc' }))

    await buttonWithText(wrapper, 'Nome').trigger('click')
    await flushPromises()
    expect(listing().slice(-1)[0]![0]).toEqual(expect.objectContaining({ sort: 'name,desc' }))

    await buttonWithText(wrapper, 'Nome').trigger('click')
    await flushPromises()
    expect(listing().slice(-1)[0]![0]).toEqual(expect.objectContaining({ sort: 'createdOn,desc' }))
  })

  it('goes to another page and changes the page size', async () => {
    const { wrapper } = await render(wallets, 40)

    await buttonWithText(wrapper, '2').trigger('click')
    await flushPromises()

    expect(listing().slice(-1)[0]![0]).toEqual(expect.objectContaining({ page: 1, size: 15 }))

    wrapper.getComponent(Select).vm.$emit('update:modelValue', '30')
    await flushPromises()

    expect(listing().slice(-1)[0]![0]).toEqual(expect.objectContaining({ page: 0, size: 30 }))
  })

  it('opens the form to create a wallet', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Nova carteira').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('wallets.create')
  })

  it('opens the detail of the clicked row', async () => {
    const { wrapper, router } = await render()

    await wrapper.findAll('tbody tr')[0]!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('wallets.detail')
    expect(router.currentRoute.value.params.id).toBe('w-1')
  })

  it('links the name of each wallet to its detail', async () => {
    const { wrapper } = await render()

    const link = wrapper.findAll('tbody tr')[1]!.find('a')

    expect(link.text()).toBe('Cash')
    expect(link.attributes('href')).toBe('/wallets/w-2/detail')
  })

  it('opens the form to edit a wallet from the menu of its row', async () => {
    const { wrapper, router } = await render()

    await chooseRowAction(wrapper, 1, 'Editar')

    expect(router.currentRoute.value.name).toBe('wallets.update')
    expect(router.currentRoute.value.params.id).toBe('w-2')
  })

  it('lists the wallets as cards on a small screen', async () => {
    useCompactViewport(true)

    const { wrapper } = await render()

    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.findAll('[data-slot="items-cards"] > [data-slot="card"]')).toHaveLength(2)
  })

  describe('removing', () => {
    it('asks first, naming the wallet and what happens to its data, then removes it', async () => {
      const { wrapper } = await render()
      vi.mocked(walletsApi.remove).mockResolvedValue(undefined)
      const dialog = useConfirmDialog()

      await chooseRowAction(wrapper, 0, 'Remover')

      expect(dialog.state.options.title).toBe('Remover a carteira “Main”?')
      expect(dialog.state.options.description).toBe('Não dá para desfazer.')
      expect(walletsApi.remove).not.toHaveBeenCalled()

      dialog.accept()
      await flushPromises()

      expect(walletsApi.remove).toHaveBeenCalledWith('w-1')
      expect(wrapper.findAll('tbody tr')).toHaveLength(1)
      expect(toast.success).toHaveBeenCalledWith('Carteira removida', {
        description: '“Main” saiu da lista.',
        duration: 4000,
      })
    })

    it('refreshes the counts of the statuses after removing', async () => {
      const { wrapper } = await render()
      vi.mocked(walletsApi.remove).mockResolvedValue(undefined)
      serve(wallets.slice(1), 1, { ACTIVE: 3, INACTIVE: 1, ALL: 4 })
      const dialog = useConfirmDialog()

      await chooseRowAction(wrapper, 0, 'Remover')
      dialog.accept()
      await flushPromises()

      expect(buttonWithText(wrapper, 'Ativas').text()).toBe('Ativas 3')
    })

    it('keeps the wallet when the removal is not confirmed', async () => {
      const { wrapper } = await render()
      const dialog = useConfirmDialog()

      await chooseRowAction(wrapper, 0, 'Remover')
      dialog.cancel()
      await flushPromises()

      expect(walletsApi.remove).not.toHaveBeenCalled()
      expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    })

    it('shows the server error above the table when the removal fails', async () => {
      const { wrapper } = await render()
      vi.mocked(walletsApi.remove).mockRejectedValue(
        problem(400, { error: 'data-integrity-violation' }),
      )
      const dialog = useConfirmDialog()

      await chooseRowAction(wrapper, 0, 'Remover')
      dialog.accept()
      await flushPromises()

      expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
        'vinculado a outros registros',
      )
      expect(wrapper.findAll('tbody tr')).toHaveLength(2)
      expect(toast.success).not.toHaveBeenCalled()
    })
  })

  describe('states', () => {
    it('invites the user to create the first wallet when none exists', async () => {
      const { wrapper, router } = await render([], 0, { ACTIVE: 0, INACTIVE: 0, ALL: 0 })

      const state = wrapper.find('[data-state="empty"]')
      expect(state.text()).toContain('Nenhuma carteira ainda')
      expect(wrapper.find('table').exists()).toBe(false)

      await state.find('button').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.name).toBe('wallets.create')
    })

    it('says nothing matched the search and clears it', async () => {
      const { wrapper } = await render([], 0)
      await wrapper.find('input').setValue('poupanca')
      await wrapper.find('input').trigger('keydown', { key: 'Enter' })
      await flushPromises()

      const state = wrapper.find('[data-state="no-result"]')
      expect(state.text()).toContain('Nada encontrado para “poupanca”')

      await state.find('button').trigger('click')
      await flushPromises()

      expect(listing().slice(-1)[0]![0]).toEqual(
        expect.objectContaining({ filter: '', status: 'ACTIVE' }),
      )
    })

    it('still treats an unregistered list as empty when the counts cannot be had', async () => {
      vi.mocked(walletsApi.findAll).mockImplementation((query: PageQuery) =>
        query.size === 1 ? Promise.reject(problem(500)) : Promise.resolve(pageOf([], 0)),
      )

      const { wrapper } = await mountView(WalletListView_, 'wallets')

      expect(wrapper.find('[data-state="empty"]').exists()).toBe(true)
      expect(wrapper.findAll('[data-slot="status-count"]')).toHaveLength(0)
    })

    it('says nothing matched, not that nothing exists, when counts are unknown and a status is picked', async () => {
      vi.mocked(walletsApi.findAll).mockImplementation((query: PageQuery) =>
        query.size === 1 ? Promise.reject(problem(500)) : Promise.resolve(pageOf([], 0)),
      )
      const { wrapper } = await mountView(WalletListView_, 'wallets')

      await buttonWithText(wrapper, 'Inativas').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-state="no-result"]').exists()).toBe(true)
    })

    it('offers to show every wallet when the status alone found none', async () => {
      const { wrapper } = await render([], 0, { ACTIVE: 0, INACTIVE: 0, ALL: 2 })

      const state = wrapper.find('[data-state="no-result"]')
      expect(state.text()).toContain('Nada encontrado neste filtro')

      await state.find('button').trigger('click')
      await flushPromises()

      expect(listing().slice(-1)[0]![0]).toEqual(expect.objectContaining({ status: 'ALL' }))
    })

    it('shows the error state with the server message when the listing fails and tries again', async () => {
      vi.mocked(walletsApi.findAll).mockRejectedValue(problem(500))
      const { wrapper } = await mountView(WalletListView_, 'wallets')

      const state = wrapper.find('[data-state="error"]')
      expect(state.text()).toContain('Não foi possível carregar as carteiras')
      expect(state.text()).toContain('Tente novamente mais tarde')
      expect(wrapper.find('table').exists()).toBe(false)

      serve()
      await state.find('button').trigger('click')
      await flushPromises()

      expect(stateOf(wrapper)).toBeUndefined()
      expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    })
  })
})
