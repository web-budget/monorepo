import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { walletsApi } from '@/api/wallets'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, problem } from '@/test/crud'
import type { WalletView } from '@/types'
import WalletDetailView from '@/views/registration/wallets/WalletDetailView.vue'

vi.mock('@/api/wallets')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const wallet: WalletView = {
  id: 'w-1',
  name: 'Main',
  type: 'BANK_ACCOUNT',
  currentBalance: 10,
  active: true,
  description: null,
  bank: 'ACME',
  agency: '123',
  number: '456',
}

async function render(view: WalletView = wallet) {
  vi.mocked(walletsApi.findById).mockResolvedValue(view)
  return mountView(WalletDetailView, 'wallets', { id: 'w-1' })
}

describe('WalletDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the wallet in sections, with its name as the title and its status next to it', async () => {
    const { wrapper } = await render()

    expect(walletsApi.findById).toHaveBeenCalledWith('w-1')
    expect(wrapper.find('h1').text()).toBe('Main')
    expect(wrapper.find('[data-slot="page-description"]').exists()).toBe(false)
    expect(wrapper.find('[data-slot="page-title"]').element.parentElement!.textContent).toContain(
      'Ativo',
    )
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual([
      'Identificação',
      'Dados do banco',
      'Saldo',
    ])
    expect(wrapper.text()).toContain('Conta Bancária')
    expect(wrapper.text()).toContain('ACME')
    expect(wrapper.text()).toContain('123')
    expect(wrapper.text()).toContain('456')
    expect(wrapper.text()).toContain('---')
    expect(wrapper.text()).toMatch(/R\$\s?10,00/)
  })

  it('leaves the bank section out of a personal wallet', async () => {
    const { wrapper } = await render({ ...wallet, type: 'PERSONAL', bank: null })

    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual(['Identificação', 'Saldo'])
  })

  it('shows only the actions while the wallet is loading', async () => {
    vi.mocked(walletsApi.findById).mockReturnValue(new Promise(() => undefined))

    const { wrapper } = await mountView(WalletDetailView, 'wallets', { id: 'w-1' })

    expect(wrapper.find('h1').text()).toBe('Detalhando carteira')
    expect(wrapper.find('dl').exists()).toBe(false)
    expect(buttonWithText(wrapper, 'Editar')).toBeDefined()
    expect(buttonWithText(wrapper, 'Remover')).toBeDefined()
  })

  it('goes to the edit form', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Editar').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('wallets.update')
    expect(router.currentRoute.value.params.id).toBe('w-1')
  })

  it('asks first, naming the wallet, then removes it and goes to the listing', async () => {
    const { wrapper, router } = await render()
    vi.mocked(walletsApi.remove).mockResolvedValue(undefined)
    const dialog = useConfirmDialog()

    await buttonWithText(wrapper, 'Remover').trigger('click')

    expect(dialog.state.options.title).toBe('Remover a carteira “Main”?')

    dialog.accept()
    await flushPromises()

    expect(walletsApi.remove).toHaveBeenCalledWith('w-1')
    expect(toast.success).toHaveBeenCalledWith('Carteira removida', {
      description: '“Main” saiu da lista.',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).toBe('wallets')
  })

  it('removes nothing when the removal is not confirmed', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Remover').trigger('click')
    useConfirmDialog().cancel()
    await flushPromises()

    expect(walletsApi.remove).not.toHaveBeenCalled()
    expect(router.currentRoute.value.name).not.toBe('wallets')
  })

  it('shows the server error when the removal fails and stays on the page', async () => {
    const { wrapper, router } = await render()
    vi.mocked(walletsApi.remove).mockRejectedValue(
      problem(400, { error: 'data-integrity-violation' }),
    )

    await buttonWithText(wrapper, 'Remover').trigger('click')
    useConfirmDialog().accept()
    await flushPromises()

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'vinculado a outros registros',
    )
    expect(toast.success).not.toHaveBeenCalled()
    expect(router.currentRoute.value.name).not.toBe('wallets')
  })

  it('shows the server error when the wallet cannot be loaded', async () => {
    vi.mocked(walletsApi.findById).mockRejectedValue(problem(404))

    const { wrapper } = await mountView(WalletDetailView, 'wallets', { id: 'w-9' })

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'O recurso solicitado não existe',
    )
  })
})
