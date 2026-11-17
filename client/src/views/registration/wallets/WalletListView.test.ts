import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { walletsApi } from '@/api/wallets'
import { Select } from '@/components/ui/select'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, pageOf, problem } from '@/test/crud'
import type { WalletListView } from '@/types'
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

async function render(content = wallets, total = content.length) {
  vi.mocked(walletsApi.findAll).mockResolvedValue(pageOf(content, total))
  return mountView(WalletListView_, 'wallets')
}

describe('WalletListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('loads the active wallets on mount and lists them', async () => {
    const { wrapper } = await render()

    expect(walletsApi.findAll).toHaveBeenCalledWith({
      filter: '',
      status: 'ACTIVE',
      page: 0,
      size: 15,
      sort: 'createdOn,asc',
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

  it('searches by the typed filter', async () => {
    const { wrapper } = await render()

    await wrapper.find('input').setValue('Mai')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(walletsApi.findAll).toHaveBeenLastCalledWith(expect.objectContaining({ filter: 'Mai' }))
  })

  it('filters by status and clears the filter', async () => {
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Todos').trigger('click')
    await flushPromises()

    expect(walletsApi.findAll).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'ALL' }))

    await wrapper.find('button[aria-label="Limpar filtro"]').trigger('click')
    await flushPromises()

    expect(walletsApi.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ filter: '', status: 'ACTIVE' }),
    )
  })

  it('sorts by a column', async () => {
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Nome').trigger('click')
    await flushPromises()
    await buttonWithText(wrapper, 'Nome').trigger('click')
    await flushPromises()

    expect(walletsApi.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: 'name,desc' }),
    )
  })

  it('goes to another page and changes the page size', async () => {
    const { wrapper } = await render(wallets, 40)

    await buttonWithText(wrapper, '2').trigger('click')
    await flushPromises()

    expect(walletsApi.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, size: 15 }),
    )

    wrapper.getComponent(Select).vm.$emit('update:modelValue', '30')
    await flushPromises()

    expect(walletsApi.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 0, size: 30 }),
    )
  })

  it('opens the form to create a wallet', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Novo').trigger('click')
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

  it('opens the form to edit a wallet', async () => {
    const { wrapper, router } = await render()

    await wrapper.findAll('button[aria-label="Editar"]')[1]!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('wallets.update')
    expect(router.currentRoute.value.params.id).toBe('w-2')
  })

  it('deletes a wallet after confirmation', async () => {
    const { wrapper } = await render()
    vi.mocked(walletsApi.remove).mockResolvedValue(undefined)

    await wrapper.findAll('button[aria-label="Deletar"]')[0]!.trigger('click')
    useConfirmDialog().accept()
    await flushPromises()

    expect(walletsApi.remove).toHaveBeenCalledWith('w-1')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(toast.success).toHaveBeenCalledWith('Registro excluído', {
      description: 'Carteira excluída com sucesso',
      duration: 4000,
    })
  })

  it('keeps the wallet when the deletion is not confirmed', async () => {
    const { wrapper } = await render()

    await wrapper.findAll('button[aria-label="Deletar"]')[0]!.trigger('click')
    useConfirmDialog().cancel()
    await flushPromises()

    expect(walletsApi.remove).not.toHaveBeenCalled()
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('shows the server error when the deletion fails', async () => {
    const { wrapper } = await render()
    vi.mocked(walletsApi.remove).mockRejectedValue(
      problem(400, { error: 'data-integrity-violation' }),
    )

    await wrapper.findAll('button[aria-label="Deletar"]')[0]!.trigger('click')
    useConfirmDialog().accept()
    await flushPromises()

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'vinculado a outros registros',
    )
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('shows the server error when the listing fails', async () => {
    vi.mocked(walletsApi.findAll).mockRejectedValue(problem(500))

    const { wrapper } = await mountView(WalletListView_, 'wallets')

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'Tente novamente mais tarde',
    )
  })
})
