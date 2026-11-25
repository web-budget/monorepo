import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { transfersApi } from '@/api/transfers'
import { walletsApi } from '@/api/wallets'
import GiveBackDialog from '@/components/transfers/GiveBackDialog.vue'
import { buttonWithText, mountView, problem } from '@/test/crud'
import type { TransferView, WalletView } from '@/types'
import TransferDetailView from '@/views/financial/transfers/TransferDetailView.vue'

vi.mock('@/api/transfers')
vi.mock('@/api/wallets')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const transfer: TransferView = {
  id: 't-1',
  createdOn: '2026-11-20T14:02:00',
  value: 500,
  description: 'Aluguel',
  fromWallet: { id: 'w-1', name: 'Conta corrente' },
  toWallet: { id: 'w-2', name: 'Poupança' },
  returnOf: null,
  returnedBy: null,
  returnable: true,
}

function serve(content: Partial<TransferView> = {}) {
  vi.mocked(transfersApi.findById).mockImplementation((id) =>
    Promise.resolve({ ...transfer, id, ...content }),
  )
  vi.mocked(walletsApi.findById).mockResolvedValue({ currentBalance: 100 } as WalletView)
}

async function render(content: Partial<TransferView> = {}) {
  serve(content)
  return mountView(TransferDetailView, 'transfers', { id: 't-1' })
}

describe('TransferDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the transfer, the way to the statement and to give it back', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Conta corrente → Poupança')
    expect(wrapper.text()).toContain('Aluguel')
    expect(wrapper.text()).toMatch(/R\$\s500,00/)
    expect(wrapper.text()).not.toContain('Devolução')
    expect(wrapper.text()).not.toContain('Inativo')
    expect(wrapper.find('a[href="/financial/statement?wallet=w-1"]').text()).toBe('Ver no extrato')
    expect(buttonWithText(wrapper, 'Devolver')).toBeDefined()
    expect(wrapper.text()).not.toContain('Remover')
  })

  it('links to the return of a returned transfer and offers no give back', async () => {
    const { wrapper } = await render({
      returnable: false,
      returnedBy: { id: 't-2', createdOn: '2026-11-21T09:00:00' },
    })

    expect(wrapper.text()).toContain('Devolvida')
    expect(wrapper.find('a[href="/transfers/t-2/detail"]').text()).toBe('Devolvida em 21/11/2026')
    expect(() => buttonWithText(wrapper, 'Devolver')).toThrow('no button "Devolver"')
  })

  it('links to the original of a return', async () => {
    const { wrapper } = await render({
      returnable: false,
      returnOf: { id: 't-0', createdOn: '2026-11-19T09:00:00' },
    })

    expect(wrapper.find('a[href="/transfers/t-0/detail"]').text()).toBe(
      'Devolve a transferência de 19/11/2026',
    )
    expect(wrapper.text()).toContain('Devolução')
  })

  it('gives the transfer back from the dialog and goes to the new one', async () => {
    vi.mocked(transfersApi.giveBack).mockResolvedValue('t-2')
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Devolver').trigger('click')
    await flushPromises()
    const dialog = wrapper.getComponent(GiveBackDialog)
    expect(dialog.props('transfer')).toMatchObject({ id: 't-1' })
    dialog.vm.$emit('confirm', dialog.props('transfer'))
    await flushPromises()

    expect(transfersApi.giveBack).toHaveBeenCalledWith('t-1')
    expect(toast.success).toHaveBeenCalledWith('Transferência devolvida', {
      description: 'As duas carteiras ganharam uma linha no extrato.',
      duration: 4000,
    })
    expect(dialog.props('transfer')).toBeNull()
    expect(router.currentRoute.value.params.id).toBe('t-2')
  })

  it('closes the dialog without giving back', async () => {
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Devolver').trigger('click')
    wrapper.getComponent(GiveBackDialog).vm.$emit('close')
    await flushPromises()

    expect(wrapper.getComponent(GiveBackDialog).props('transfer')).toBeNull()
    expect(transfersApi.giveBack).not.toHaveBeenCalled()
  })

  it('keeps the dialog open and shows why the give back failed', async () => {
    vi.mocked(transfersApi.giveBack).mockRejectedValue(
      problem(409, { error: 'transfer-already-returned' }),
    )
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Devolver').trigger('click')
    const dialog = wrapper.getComponent(GiveBackDialog)
    dialog.vm.$emit('confirm', dialog.props('transfer'))
    await flushPromises()

    expect(dialog.props('transfer')).not.toBeNull()
    expect(wrapper.find('[data-slot="server-error"]').text()).toContain('já foi devolvida')
  })

  it('loads the other transfer when the id changes', async () => {
    const { wrapper } = await render()

    await wrapper.setProps({ id: 't-2' })
    await flushPromises()

    expect(transfersApi.findById).toHaveBeenLastCalledWith('t-2')
  })

  it('shows the server error when the transfer cannot be loaded', async () => {
    serve()
    vi.mocked(transfersApi.findById).mockRejectedValue(problem(404))

    const { wrapper } = await mountView(TransferDetailView, 'transfers', { id: 't-1' })

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
    expect(wrapper.find('h1').text()).toBe('Detalhando')
  })
})
