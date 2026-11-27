import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { toast } from 'vue-sonner'
import { reconciliationsApi } from '@/api/reconciliations'
import { walletsApi } from '@/api/wallets'
import ReconcileDialog from '@/components/wallets/ReconcileDialog.vue'
import ReconciliationHistory from '@/components/wallets/ReconciliationHistory.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, pageOf, problem, useCompactViewport } from '@/test/crud'
import type { ReconciliationView, WalletView } from '@/types'
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

const leaf = { render: () => h('div') }
const extraRoutes = [
  { path: '/statement/:wallet/:id/detail', name: 'statement.detail', component: leaf },
]

function reconciliationOf(index: number, overrides: Partial<ReconciliationView> = {}) {
  return {
    id: `r-${index}`,
    createdOn: `2026-11-${String(30 - index).padStart(2, '0')}T09:30:00`,
    informedBalance: 110,
    walletBalance: 100,
    difference: 10,
    reason: `Motivo ${index}`,
    entryId: `e-${index}`,
    ...overrides,
  }
}

const history = [reconciliationOf(2), reconciliationOf(1, { difference: -35, informedBalance: -5 })]

async function render(
  view: WalletView = wallet,
  location = '/wallets/w-1/detail',
  rows = history,
  total = rows.length,
) {
  vi.mocked(walletsApi.findById).mockResolvedValue(view)
  vi.mocked(reconciliationsApi.findAll).mockResolvedValue(pageOf(rows, total))
  return mountView(WalletDetailView, 'wallets', { id: 'w-1' }, {}, location, extraRoutes)
}

function historyCalls() {
  return vi.mocked(reconciliationsApi.findAll).mock.calls
}

describe('WalletDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
    useCompactViewport(false)
    vi.mocked(reconciliationsApi.findAll).mockResolvedValue(pageOf([]))
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
      'Conciliações',
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

    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual([
      'Identificação',
      'Saldo',
      'Conciliações',
    ])
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

  describe('the last reconciliation', () => {
    it('shows the date and time, with the credit adjustment under it', async () => {
      const { wrapper } = await render({
        ...wallet,
        lastReconciliation: { id: 'r-2', createdOn: '2026-11-20T09:30:00', difference: 12.4 },
      })

      expect(wrapper.text()).toContain('Última conciliação')
      expect(wrapper.text()).toContain('20/11/2026 09:30')
      expect(wrapper.text()).toContain('Ajuste de crédito de 12,40')
      expect(wrapper.text()).not.toContain('Nenhuma ainda')
    })

    it('says debit and shows the amount without a sign', async () => {
      const { wrapper } = await render({
        ...wallet,
        lastReconciliation: { id: 'r-1', createdOn: '2026-11-10T18:05:00', difference: -35 },
      })

      expect(wrapper.text()).toContain('10/11/2026 18:05')
      expect(wrapper.text()).toContain('Ajuste de débito de 35,00')
      expect(wrapper.text()).not.toContain('débito de −35,00')
    })

    it.each([[undefined], [null]])('says there is none yet when it is %s', async (last) => {
      const { wrapper } = await render({ ...wallet, lastReconciliation: last })

      expect(wrapper.text()).toContain('Última conciliação')
      expect(wrapper.text()).toContain('Nenhuma ainda')
    })
  })

  describe('the history', () => {
    it('lists the first page, in the order the server gives, with the way to each adjustment', async () => {
      const { wrapper } = await render()

      expect(historyCalls()).toEqual([['w-1', { page: 0, size: 15 }]])
      expect(reconciliationsApi.findPosition).not.toHaveBeenCalled()
      const rows = wrapper.findAll('[data-slot="reconciliation-history"] tbody tr')
      expect(rows.map((row) => row.findAll('td')[4]!.text())).toEqual(['Motivo 2', 'Motivo 1'])
      expect(rows[1]!.find('a').attributes('href')).toBe('/statement/w-1/e-1/detail')
      expect(wrapper.text()).toContain('1–2 de 2 conciliações')
    })

    it('shows the empty state, which opens the dialog of an active wallet', async () => {
      const { wrapper } = await render(wallet, undefined, [])

      const empty = wrapper.find('[data-slot="reconciliation-history-empty"]')
      expect(empty.text()).toContain('Nenhuma conciliação ainda')
      await empty.find('button').trigger('click')
      expect(wrapper.getComponent(ReconcileDialog).props('wallet')).toMatchObject({ id: 'w-1' })
    })

    it('does not offer to reconcile an inactive wallet from the empty state', async () => {
      const { wrapper } = await render({ ...wallet, active: false }, undefined, [])

      expect(
        wrapper.find('[data-slot="reconciliation-history-empty"]').find('button').exists(),
      ).toBe(false)
    })

    it('reads the page and the size from the URL', async () => {
      await render(
        wallet,
        '/wallets/w-1/detail?reconciliationsPage=3&reconciliationsSize=30',
        history,
        100,
      )

      expect(historyCalls()).toEqual([['w-1', { page: 2, size: 30 }]])
      expect(reconciliationsApi.findPosition).not.toHaveBeenCalled()
    })

    it('ignores a page and a size that make no sense', async () => {
      await render(wallet, '/wallets/w-1/detail?reconciliationsPage=abc&reconciliationsSize=7')

      expect(historyCalls()).toEqual([['w-1', { page: 0, size: 15 }]])
    })

    it('puts the page and the size in the URL, and leaves out what is the default', async () => {
      const { wrapper, router } = await render(wallet, undefined, history, 100)
      const table = wrapper.getComponent(ReconciliationHistory)

      table.vm.$emit('pageChanged', { currentPage: 1, pageSize: 15 })
      await flushPromises()
      expect(historyCalls().slice(-1)[0]).toEqual(['w-1', { page: 1, size: 15 }])
      expect(router.currentRoute.value.fullPath).toBe('/wallets/w-1/detail?reconciliationsPage=2')

      table.vm.$emit('pageChanged', { currentPage: 0, pageSize: 30 })
      await flushPromises()
      expect(historyCalls().slice(-1)[0]).toEqual(['w-1', { page: 0, size: 30 }])
      expect(router.currentRoute.value.fullPath).toBe('/wallets/w-1/detail?reconciliationsSize=30')
      expect(historyCalls()).toHaveLength(3)
    })

    it('follows the URL when it changes from the outside, and not when the page changed it', async () => {
      const { router } = await render()

      await router.push('/wallets/w-1/detail?reconciliationsPage=2')
      await flushPromises()

      expect(historyCalls()).toHaveLength(2)
      expect(historyCalls()[1]).toEqual(['w-1', { page: 1, size: 15 }])
    })

    it('does nothing when the route leaves the wallet', async () => {
      const { router } = await render()

      await router.push('/wallets')
      await flushPromises()

      expect(historyCalls()).toHaveLength(1)
    })

    it('loads again for another wallet', async () => {
      const { wrapper } = await render()

      await wrapper.setProps({ id: 'w-2' })
      await flushPromises()

      expect(historyCalls().slice(-1)[0]).toEqual(['w-2', { page: 0, size: 15 }])
    })

    it('shows the server error when the history cannot be loaded', async () => {
      vi.mocked(walletsApi.findById).mockResolvedValue(wallet)
      vi.mocked(reconciliationsApi.findAll).mockRejectedValue(problem(500))

      const { wrapper } = await mountView(WalletDetailView, 'wallets', { id: 'w-1' })

      expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
      expect(wrapper.find('[data-slot="reconciliation-history"]').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('Nenhuma conciliação ainda')
    })

    it('keeps the page it has when another page cannot be loaded', async () => {
      const { wrapper } = await render(wallet, undefined, history, 100)
      vi.mocked(reconciliationsApi.findAll).mockRejectedValue(problem(500))

      wrapper
        .getComponent(ReconciliationHistory)
        .vm.$emit('pageChanged', { currentPage: 1, pageSize: 15 })
      await flushPromises()

      expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
      expect(wrapper.findAll('[data-slot="reconciliation-history"] tbody tr')).toHaveLength(2)
    })

    it('shows the cards of a small screen with the way to the adjustment', async () => {
      useCompactViewport(true)

      const { wrapper } = await render()

      expect(wrapper.find('[data-layout="compact"]').text()).toContain('Ver ajuste')
    })
  })

  describe('with a reconciliation in the URL', () => {
    const target = reconciliationOf(1)

    beforeEach(() => {
      vi.mocked(reconciliationsApi.findPosition).mockResolvedValue({ position: 17 })
    })

    it('opens the page of the reconciliation, highlights its row and scrolls to it', async () => {
      const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')

      const { wrapper, router } = await render(
        wallet,
        '/wallets/w-1/detail?reconciliation=r-1',
        [target],
        40,
      )

      expect(reconciliationsApi.findPosition).toHaveBeenCalledWith('w-1', 'r-1')
      expect(historyCalls()).toEqual([['w-1', { page: 1, size: 15 }]])
      expect(router.currentRoute.value.fullPath).toBe(
        '/wallets/w-1/detail?reconciliation=r-1&reconciliationsPage=2',
      )
      const row = wrapper.find('#reconciliation-r-1')
      expect(row.attributes('data-selected')).toBe('true')
      expect(scroll).toHaveBeenCalledWith({ block: 'center' })
      expect(scroll.mock.contexts.slice(-1)[0]).toBe(row.element)
      scroll.mockRestore()
    })

    it('uses the size of the URL to find the page', async () => {
      await render(
        wallet,
        '/wallets/w-1/detail?reconciliation=r-1&reconciliationsSize=30',
        [target],
        40,
      )

      expect(historyCalls()).toEqual([['w-1', { page: 0, size: 30 }]])
    })

    it('trusts the page of the URL over the position', async () => {
      const { wrapper } = await render(
        wallet,
        '/wallets/w-1/detail?reconciliation=r-1&reconciliationsPage=1',
        [target],
        40,
      )

      expect(reconciliationsApi.findPosition).not.toHaveBeenCalled()
      expect(historyCalls()).toEqual([['w-1', { page: 0, size: 15 }]])
      expect(wrapper.find('#reconciliation-r-1').attributes('data-selected')).toBe('true')
    })

    it('keeps the highlight when it pages', async () => {
      const { wrapper, router } = await render(
        wallet,
        '/wallets/w-1/detail?reconciliation=r-1',
        [target],
        40,
      )

      wrapper.getComponent(ReconciliationHistory).vm.$emit('pageChanged', {
        currentPage: 2,
        pageSize: 15,
      })
      await flushPromises()

      expect(router.currentRoute.value.fullPath).toBe(
        '/wallets/w-1/detail?reconciliation=r-1&reconciliationsPage=3',
      )
      expect(reconciliationsApi.findPosition).toHaveBeenCalledTimes(1)
    })

    it('shows the first page with no highlight when the reconciliation is not of the wallet', async () => {
      vi.mocked(reconciliationsApi.findPosition).mockRejectedValue(problem(404))

      const { wrapper, router } = await render(wallet, '/wallets/w-1/detail?reconciliation=r-9')

      expect(historyCalls()).toEqual([['w-1', { page: 0, size: 15 }]])
      expect(wrapper.find('tbody [data-selected]').exists()).toBe(false)
      expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(false)
      expect(router.currentRoute.value.fullPath).toBe('/wallets/w-1/detail')
    })

    it('shows the server error when the position cannot be read', async () => {
      vi.mocked(reconciliationsApi.findPosition).mockRejectedValue(problem(500))

      const { wrapper } = await render(wallet, '/wallets/w-1/detail?reconciliation=r-1')

      expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
    })

    it('goes back to the first page, with no highlight, after a new reconciliation', async () => {
      vi.mocked(reconciliationsApi.reconcile).mockResolvedValue({
        reconciliation: { difference: 1 },
      } as never)

      const { wrapper, router } = await render(
        wallet,
        '/wallets/w-1/detail?reconciliation=r-1&reconciliationsPage=2',
        [target],
        40,
      )
      await buttonWithText(wrapper, 'Conciliar').trigger('click')
      const dialog = wrapper.getComponent(ReconcileDialog)
      dialog.vm.$emit('reconcile', dialog.props('wallet'), {
        informedBalance: 11,
        shownBalance: 10,
        reason: 'Centavos',
      })
      await flushPromises()

      expect(historyCalls().slice(-1)[0]).toEqual(['w-1', { page: 0, size: 15 }])
      expect(router.currentRoute.value.fullPath).toBe('/wallets/w-1/detail')
      expect(wrapper.find('tbody [data-selected]').exists()).toBe(false)
    })
  })
})
