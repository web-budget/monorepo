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

async function render() {
  vi.mocked(walletsApi.findById).mockResolvedValue(wallet)
  return mountView(WalletDetailView, 'wallets', { id: 'w-1' })
}

describe('WalletDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the wallet', async () => {
    const { wrapper } = await render()

    expect(walletsApi.findById).toHaveBeenCalledWith('w-1')
    expect(wrapper.text()).toContain('Detalhando carteira')
    expect(wrapper.text()).toContain('Ativo')
    expect(wrapper.text()).toContain('Main')
    expect(wrapper.text()).toContain('Conta Bancária')
    expect(wrapper.text()).toContain('ACME')
    expect(wrapper.text()).toContain('123')
    expect(wrapper.text()).toContain('456')
    expect(wrapper.text()).toContain('---')
  })

  it('shows only the actions while the wallet is loading', async () => {
    vi.mocked(walletsApi.findById).mockReturnValue(new Promise(() => undefined))

    const { wrapper } = await mountView(WalletDetailView, 'wallets', { id: 'w-1' })

    expect(wrapper.text()).not.toContain('Main')
    expect(wrapper.find('dl').text()).toBe('')
  })

  it('goes to the listing', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Voltar').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('wallets')
  })

  it('goes to the edit form', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Editar').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('wallets.update')
    expect(router.currentRoute.value.params.id).toBe('w-1')
  })

  it('deletes the wallet after confirmation and goes to the listing', async () => {
    const { wrapper, router } = await render()
    vi.mocked(walletsApi.remove).mockResolvedValue(undefined)

    await buttonWithText(wrapper, 'Excluir').trigger('click')
    useConfirmDialog().accept()
    await flushPromises()

    expect(walletsApi.remove).toHaveBeenCalledWith('w-1')
    expect(toast.success).toHaveBeenCalledWith('Registro excluído', {
      description: 'Carteira excluída com sucesso',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).toBe('wallets')
  })

  it('does nothing when the deletion is not confirmed', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Excluir').trigger('click')
    useConfirmDialog().cancel()
    await flushPromises()

    expect(walletsApi.remove).not.toHaveBeenCalled()
    expect(router.currentRoute.value.name).not.toBe('wallets')
  })

  it('shows the server error when the deletion fails and stays on the page', async () => {
    const { wrapper, router } = await render()
    vi.mocked(walletsApi.remove).mockRejectedValue(
      problem(400, { error: 'data-integrity-violation' }),
    )

    await buttonWithText(wrapper, 'Excluir').trigger('click')
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
