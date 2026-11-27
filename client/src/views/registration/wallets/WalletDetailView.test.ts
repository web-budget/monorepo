import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { reconciliationsApi } from '@/api/reconciliations'
import { walletsApi } from '@/api/wallets'
import ReconcileDialog from '@/components/wallets/ReconcileDialog.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, problem } from '@/test/crud'
import type { WalletView } from '@/types'
import WalletDetailView from '@/views/registration/wallets/WalletDetailView.vue'

vi.mock('@/api/wallets')
vi.mock('@/api/reconciliations')
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
  lastEntryOn: '2026-11-20T10:05:00',
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
      'Ativa',
    )
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual([
      'Identificação',
      'Dados do banco',
      'Saldo',
    ])
    expect(wrapper.text()).toContain('Conta bancária')
    expect(wrapper.text()).toContain('ACME')
    expect(wrapper.text()).toContain('Agência')
    expect(wrapper.text()).toContain('123')
    expect(wrapper.text()).toContain('456')
    expect(wrapper.text()).not.toContain('Descrição')
    expect(wrapper.text()).toMatch(/R\$\s?10,00/)
    expect(wrapper.text()).toContain('Última movimentação')
    expect(wrapper.text()).toContain('20/11/2026 10:05')
  })

  it('says the balance comes from the statement', async () => {
    const { wrapper } = await render()

    const notice = wrapper.find('[data-slot="balance-notice"]')
    expect(notice.text()).toContain('O saldo não se edita na carteira')
    expect(notice.text()).toContain('Ele vem do extrato.')
  })

  it('puts the statement, the transfer and the reconciliation in the footer of the card', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('[data-slot="detail-footer"]').text()).toBe(
      'Ver extratoTransferirConciliar',
    )
  })

  it('shows a debit balance in red and no last entry for a wallet without lines', async () => {
    const { wrapper } = await render({ ...wallet, currentBalance: -312.08, lastEntryOn: null })

    expect(wrapper.text()).toMatch(/−R\$\s?312,08/)
    expect(wrapper.find('.text-expense').exists()).toBe(true)
    expect(wrapper.text()).toContain('---')
  })

  it('leaves the bank section out of a personal wallet', async () => {
    const { wrapper } = await render({ ...wallet, type: 'PERSONAL', bank: null })

    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual(['Identificação', 'Saldo'])
  })

  it('shows only the actions while the wallet is loading', async () => {
    vi.mocked(walletsApi.findById).mockReturnValue(new Promise(() => undefined))

    const { wrapper } = await mountView(WalletDetailView, 'wallets', { id: 'w-1' })

    expect(wrapper.find('h1').text()).toBe('Detalhando')
    expect(wrapper.find('dl').exists()).toBe(false)
    expect(buttonWithText(wrapper, 'Editar')).toBeDefined()
    expect(buttonWithText(wrapper, 'Excluir')).toBeDefined()
  })

  it('links to a transfer from the wallet', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('a[href="/financial/transfers/create?from=w-1"]').text()).toBe('Transferir')
  })

  it('links to the statement of the wallet', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('a[href="/financial/statement?wallet=w-1"]').text()).toBe('Ver extrato')
  })

  it('reconciles from the dialog and reloads the wallet', async () => {
    vi.mocked(reconciliationsApi.reconcile).mockResolvedValue({
      reconciliation: { difference: 1 },
    } as never)
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Conciliar').trigger('click')
    const dialog = wrapper.getComponent(ReconcileDialog)
    expect(dialog.props('wallet')).toEqual({
      id: 'w-1',
      name: 'Main',
      personal: false,
      balance: 10,
    })

    const form = { informedBalance: 11, shownBalance: 10, reason: 'Centavos' }
    dialog.vm.$emit('reconcile', dialog.props('wallet'), form)
    await flushPromises()

    expect(reconciliationsApi.reconcile).toHaveBeenCalledWith('w-1', form)
    expect(toast.success).toHaveBeenCalledWith('Carteira conciliada', {
      description: 'Ajuste de crédito de 1,00 em Main. Não entra no resultado.',
      duration: 4000,
    })
    expect(dialog.props('wallet')).toBeNull()
    expect(walletsApi.findById).toHaveBeenCalledTimes(2)
  })

  it('keeps the dialog open and shows the error when the reconciliation fails', async () => {
    vi.mocked(reconciliationsApi.reconcile).mockRejectedValue(
      problem(400, { error: 'inactive-wallet' }),
    )
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Conciliar').trigger('click')
    const dialog = wrapper.getComponent(ReconcileDialog)
    dialog.vm.$emit('reconcile', dialog.props('wallet'), {
      informedBalance: 11,
      shownBalance: 10,
      reason: 'Centavos',
    })
    await flushPromises()

    expect(dialog.props('wallet')).not.toBeNull()
    expect(dialog.props('messages')).toHaveLength(1)
    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(false)
  })

  it('keeps the dialog open with the new balance when the balance changed meanwhile', async () => {
    vi.mocked(reconciliationsApi.reconcile).mockRejectedValue(
      problem(409, {
        error: 'reconciliation-balance-changed',
        parameters: { currentBalance: 5948.16, difference: 48.5 },
      }),
    )
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Conciliar').trigger('click')
    const dialog = wrapper.getComponent(ReconcileDialog)
    dialog.vm.$emit('reconcile', dialog.props('wallet'), {
      informedBalance: 5996.66,
      shownBalance: 10,
      reason: 'Centavos',
    })
    await flushPromises()

    expect(dialog.props('wallet')).toEqual({
      id: 'w-1',
      name: 'Main',
      personal: false,
      balance: 5948.16,
    })
    expect(dialog.props('balanceChange')).toEqual({ balance: 5948.16, difference: 48.5 })
    expect(dialog.props('messages')).toHaveLength(0)
    expect(toast.success).not.toHaveBeenCalled()
    expect(walletsApi.findById).toHaveBeenCalledTimes(1)
  })

  it('closes the dialog without reconciling', async () => {
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Conciliar').trigger('click')
    wrapper.getComponent(ReconcileDialog).vm.$emit('close')
    await flushPromises()

    expect(wrapper.getComponent(ReconcileDialog).props('wallet')).toBeNull()
  })

  it('does not offer to reconcile an inactive wallet', async () => {
    const { wrapper } = await render({ ...wallet, active: false })

    expect(buttonWithText(wrapper, 'Conciliar').attributes('disabled')).toBeDefined()
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

    await buttonWithText(wrapper, 'Excluir').trigger('click')

    expect(dialog.state.options.title).toBe('Excluir a carteira “Main”?')

    dialog.accept()
    await flushPromises()

    expect(walletsApi.remove).toHaveBeenCalledWith('w-1')
    expect(toast.success).toHaveBeenCalledWith('Carteira excluída', {
      description: '“Main” saiu da lista.',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).toBe('wallets')
  })

  it('removes nothing when the removal is not confirmed', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Excluir').trigger('click')
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
