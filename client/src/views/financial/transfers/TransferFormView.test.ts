import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { transfersApi } from '@/api/transfers'
import { walletsApi } from '@/api/wallets'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { Select } from '@/components/ui/select'
import { buttonWithText, mountView, pageOf, problem, settle } from '@/test/crud'
import type { WalletView } from '@/types'
import TransferFormView from '@/views/financial/transfers/TransferFormView.vue'

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

type Wrapper = Awaited<ReturnType<typeof mountView>>['wrapper']

const wallets = [
  { id: 'w-1', name: 'Conta corrente' },
  { id: 'w-2', name: 'Poupança' },
]

const balances: Record<string, number> = { 'w-1': 1000, 'w-2': 50 }

function serve() {
  vi.mocked(walletsApi.findAll).mockResolvedValue(pageOf(wallets as never[]))
  vi.mocked(walletsApi.findById).mockImplementation((id) =>
    Promise.resolve({ currentBalance: balances[id] } as WalletView),
  )
}

async function render(location?: string) {
  serve()
  return mountView(TransferFormView, 'transfers', {}, {}, location)
}

function selects(wrapper: Wrapper) {
  return wrapper.findAllComponents(Select)
}

async function choose(wrapper: Wrapper, index: number, id: string) {
  selects(wrapper)[index]!.vm.$emit('update:modelValue', id)
  await flushPromises()
}

async function submit(wrapper: Wrapper) {
  await wrapper.find('form').trigger('submit')
  await settle()
}

describe('TransferFormView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the title, the sections and asks for the required fields', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Transferindo')
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual(['Carteiras', 'Valor'])
    expect(wrapper.find('button[type="submit"]').text()).toBe('Transferir')

    await submit(wrapper)

    expect(wrapper.text()).toContain('Campo obrigatório')
    expect(transfersApi.create).not.toHaveBeenCalled()
  })

  it('recalculates the statement of the transfer with the balances of the wallets', async () => {
    const { wrapper } = await render()

    await choose(wrapper, 0, 'w-1')
    await choose(wrapper, 1, 'w-2')
    await wrapper.find('[name="value"]').setValue('50000')
    await flushPromises()

    const statement = wrapper.find('[data-slot="transfer-statement"]').text()
    expect(statement).toMatch(/Conta corrente[\s\S]*Saldo depois\s*R\$\s500,00/)
    expect(statement).toMatch(/Poupança[\s\S]*Saldo depois\s*R\$\s550,00/)
  })

  it('transfers and goes to the detail of the new transfer', async () => {
    vi.mocked(transfersApi.create).mockResolvedValue('t-9')
    const { wrapper, router } = await render()

    await choose(wrapper, 0, 'w-1')
    await choose(wrapper, 1, 'w-2')
    await wrapper.find('[name="value"]').setValue('50000')
    await wrapper.find('[name="description"]').setValue('Aluguel')
    await submit(wrapper)

    expect(transfersApi.create).toHaveBeenCalledWith({
      fromWallet: 'w-1',
      toWallet: 'w-2',
      value: 500,
      description: 'Aluguel',
    })
    expect(toast.success).toHaveBeenCalledWith('Transferência feita', {
      description: 'De Conta corrente para Poupança.',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).toBe('transfers.detail')
    expect(router.currentRoute.value.params.id).toBe('t-9')
  })

  it('sends no note as null', async () => {
    vi.mocked(transfersApi.create).mockResolvedValue('t-9')
    const { wrapper } = await render()

    await choose(wrapper, 0, 'w-1')
    await choose(wrapper, 1, 'w-2')
    await wrapper.find('[name="value"]').setValue('100')
    await submit(wrapper)

    expect(transfersApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ description: null, value: 1 }),
    )
  })

  it('refuses the same wallet on both sides', async () => {
    const { wrapper } = await render()

    await choose(wrapper, 0, 'w-1')
    await choose(wrapper, 1, 'w-1')
    await wrapper.find('[name="value"]').setValue('100')
    await submit(wrapper)

    expect(transfersApi.create).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Origem e destino precisam ser carteiras diferentes.')
    expect(walletsApi.findById).toHaveBeenCalledTimes(1)
  })

  it('starts from the wallet of the link when it is active', async () => {
    const { wrapper } = await render('/transfers/create?from=w-2')

    expect(wrapper.find('[data-side="from"]').text()).toContain('Poupança')
  })

  it('ignores a wallet of the link that is not one of the active wallets', async () => {
    const { wrapper } = await render('/transfers/create?from=zzz')

    expect(wrapper.find('[data-side="from"]').text()).toContain('---')
  })

  it('shows the server error and keeps the form', async () => {
    vi.mocked(transfersApi.create).mockRejectedValue(problem(400, { error: 'inactive-wallet' }))
    const { wrapper, router } = await render()

    await choose(wrapper, 0, 'w-1')
    await choose(wrapper, 1, 'w-2')
    await wrapper.find('[name="value"]').setValue('100')
    await submit(wrapper)

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain('inativa')
    expect(router.currentRoute.value.name).not.toBe('transfers.detail')
  })

  it('shows the server error when the wallets cannot be loaded', async () => {
    serve()
    vi.mocked(walletsApi.findAll).mockRejectedValue(problem(500))

    const { wrapper } = await mountView(TransferFormView, 'transfers')

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
  })

  it('asks before leaving with changes that were not saved', async () => {
    const { wrapper, router } = await render()
    await wrapper.find('[name="value"]').setValue('100')

    const leaving = router.push('/transfers')
    await flushPromises()
    expect(useConfirmDialog().state.open).toBe(true)
    useConfirmDialog().cancel()
    await leaving

    expect(router.currentRoute.value.name).not.toBe('transfers')
  })

  it('leaves for the financial module from the cancel button', async () => {
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Cancelar').trigger('click')
    await flushPromises()

    expect(wrapper.exists()).toBe(true)
  })
})
