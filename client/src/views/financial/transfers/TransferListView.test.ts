import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { transfersApi } from '@/api/transfers'
import { walletsApi } from '@/api/wallets'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import GiveBackDialog from '@/components/transfers/GiveBackDialog.vue'
import { buttonWithText, mountView, useCompactViewport, pageOf, problem } from '@/test/crud'
import type { TransferQuery, TransferView, WalletView } from '@/types'
import TransferListView from '@/views/financial/transfers/TransferListView.vue'

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

const wallets = [
  { id: 'w-1', name: 'Conta corrente' },
  { id: 'w-2', name: 'Poupança' },
]

const base: TransferView = {
  id: 't-1',
  createdOn: '2026-11-20T14:02:00',
  value: 500,
  description: 'Aluguel',
  fromWallet: wallets[0]!,
  toWallet: wallets[1]!,
  returnOf: null,
  returnedBy: null,
  returnable: true,
}

const transfers: TransferView[] = [
  base,
  {
    ...base,
    id: 't-2',
    description: null,
    returnable: false,
    returnedBy: { id: 't-3', createdOn: '2026-11-21T10:00:00' },
  },
  {
    ...base,
    id: 't-3',
    returnable: false,
    returnOf: { id: 't-2', createdOn: '2026-11-19T10:00:00' },
  },
]

function serve(content = transfers, total = content.length) {
  vi.mocked(walletsApi.findAll).mockResolvedValue(pageOf(wallets as never[]))
  vi.mocked(walletsApi.findById).mockResolvedValue({ currentBalance: 100 } as WalletView)
  vi.mocked(transfersApi.findAll).mockResolvedValue(pageOf(content, total))
}

function calls() {
  return vi.mocked(transfersApi.findAll).mock.calls
}

function lastQuery(): TransferQuery {
  return calls().slice(-1)[0]![0]
}

async function render(location?: string, content = transfers, total = content.length) {
  serve(content, total)
  return mountView(TransferListView, 'transfers', {}, {}, location)
}

describe('TransferListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  afterEach(() => {
    useCompactViewport(false)
  })

  it('shows both wallets in the title of the compact card on a small screen', async () => {
    useCompactViewport(true)

    const { wrapper } = await render()

    const card = wrapper.find('[data-layout="compact"]')
    expect(card.text()).toContain('Conta corrente → Poupança')
    expect(card.text()).toContain('Aluguel')
  })

  it('lists the transfers with the wallets, the value, the note and the situation', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Transferências')
    expect(lastQuery()).toEqual({
      filter: undefined,
      wallet: undefined,
      from: undefined,
      to: undefined,
      page: 0,
      size: 15,
      sort: 'createdOn,desc',
    })
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(3)
    expect(rows[0]!.text()).toContain('20/11/2026')
    expect(rows[0]!.text()).toContain('14:02')
    expect(rows[0]!.text()).toContain('Conta corrente')
    expect(rows[0]!.text()).toContain('Poupança')
    expect(rows[0]!.text()).toContain('500,00')
    expect(rows[0]!.text()).not.toContain('R$')
    expect(rows[0]!.text()).toContain('Aluguel')
    expect(rows[1]!.text()).toContain('Devolvida')
    expect(rows[1]!.text()).toContain('—')
    expect(rows[0]!.text()).toContain('Devolver')
    expect(rows[1]!.text()).not.toContain('Devolver')
    expect(rows[2]!.text()).toContain('Devolução de 19/11')
  })

  it('opens with the state of the URL, which stays there', async () => {
    const location =
      '/transfers?wallet=w-1&from=2026-11-01&to=2026-11-30&filter=aluguel&sort=value,asc'

    const { router } = await render(location)

    expect(lastQuery()).toEqual({
      filter: 'aluguel',
      wallet: 'w-1',
      from: '2026-11-01',
      to: '2026-11-30',
      page: 0,
      size: 15,
      sort: 'value,asc',
    })
    expect(router.currentRoute.value.fullPath).toBe(location)
  })

  it('reloads with each filter and clears them', async () => {
    const { wrapper } = await render()

    wrapper.getComponent(FilterSelect).vm.$emit('update:modelValue', 'w-2')
    await flushPromises()
    expect(lastQuery().wallet).toBe('w-2')

    await wrapper.find('#transfer-from').setValue('2026-11-01')
    await flushPromises()
    expect(lastQuery().from).toBe('2026-11-01')

    await wrapper.find('#transfer-to').setValue('2026-11-30')
    await flushPromises()
    expect(lastQuery().to).toBe('2026-11-30')

    await buttonWithText(wrapper, 'Limpar').trigger('click')
    await flushPromises()
    expect(lastQuery()).toMatchObject({ wallet: undefined, from: undefined, to: undefined })
  })

  it('sorts, searches and clears the search', async () => {
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Valor (R$)').trigger('click')
    await flushPromises()
    expect(lastQuery().sort).toBe('value,asc')

    await wrapper.find('input').setValue('aluguel')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(lastQuery()).toMatchObject({ filter: 'aluguel', page: 0 })

    await wrapper.find('button[aria-label="Limpar filtro"]').trigger('click')
    await flushPromises()
    expect(lastQuery().filter).toBeUndefined()
  })

  it('goes to the next page', async () => {
    const { wrapper } = await render(undefined, transfers, 40)

    await wrapper.find('button[aria-label="Próxima página"]').trigger('click')
    await flushPromises()

    expect(lastQuery()).toMatchObject({ page: 1, size: 15 })
  })

  it('shows the empty state and goes to the form from it', async () => {
    const { wrapper, router } = await render(undefined, [])

    expect(wrapper.find('[data-state="empty"]').text()).toContain('Nenhuma transferência ainda')
    await wrapper.find('[data-state="empty"] button').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('transfers.create')
  })

  it('says nothing matched the filters and clears the search', async () => {
    const { wrapper } = await render('/transfers?wallet=w-1', [])

    expect(wrapper.find('[data-state="no-result"]').exists()).toBe(true)
    await wrapper.find('[data-state="no-result"] button').trigger('click')
    await flushPromises()

    expect(calls().length).toBeGreaterThan(1)
  })

  it('shows the error state and retries', async () => {
    serve()
    vi.mocked(transfersApi.findAll).mockRejectedValue(problem(500))
    const { wrapper } = await mountView(TransferListView, 'transfers')
    expect(wrapper.find('[data-state="error"]').exists()).toBe(true)

    vi.mocked(transfersApi.findAll).mockResolvedValue(pageOf(transfers))
    await wrapper.find('[data-state="error"] button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-state="error"]').exists()).toBe(false)
  })

  it('shows the server error when the wallets cannot be loaded', async () => {
    serve()
    vi.mocked(walletsApi.findAll).mockRejectedValue(problem(500))

    const { wrapper } = await mountView(TransferListView, 'transfers')

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
  })

  it('goes to the form from the header button', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Criar').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('transfers.create')
  })

  it('opens the detail of a transfer from the row', async () => {
    const { wrapper, router } = await render()

    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('transfers.detail')
  })

  it('closes the give back dialog without giving back', async () => {
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Devolver').trigger('click')
    wrapper.getComponent(GiveBackDialog).vm.$emit('close')
    await flushPromises()

    expect(wrapper.getComponent(GiveBackDialog).props('transfer')).toBeNull()
    expect(transfersApi.giveBack).not.toHaveBeenCalled()
  })

  it('gives a transfer back from the row', async () => {
    vi.mocked(transfersApi.giveBack).mockResolvedValue('t-9')
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Devolver').trigger('click')
    const dialog = wrapper.getComponent(GiveBackDialog)
    expect(dialog.props('transfer')).toMatchObject({ id: 't-1' })
    dialog.vm.$emit('confirm', dialog.props('transfer'))
    await flushPromises()

    expect(transfersApi.giveBack).toHaveBeenCalledWith('t-1')
    expect(router.currentRoute.value.params.id).toBe('t-9')
    expect(dialog.props('transfer')).toBeNull()
  })
})
