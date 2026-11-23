import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { classificationsApi } from '@/api/classifications'
import { costCentersApi } from '@/api/costCenters'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { walletEntriesApi } from '@/api/walletEntries'
import { walletsApi } from '@/api/wallets'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import AdjustBalanceDialog from '@/components/wallets/AdjustBalanceDialog.vue'
import { buttonWithText, mountView, pageOf, problem } from '@/test/crud'
import type { StatementQuery, WalletEntryView, WalletView } from '@/types'
import StatementView from '@/views/financial/statement/StatementView.vue'

vi.mock('@/api/walletEntries')
vi.mock('@/api/wallets')
vi.mock('@/api/financialPeriods')
vi.mock('@/api/costCenters')
vi.mock('@/api/classifications')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const wallets = [
  { id: 'w-1', name: 'Conta corrente', type: 'BANK_ACCOUNT', bank: 'Banco', active: true },
  { id: 'w-2', name: 'Poupança antiga', type: 'INVESTMENT', bank: null, active: false },
]

const entries: WalletEntryView[] = [
  {
    id: 'e-1',
    createdOn: '2026-11-20T14:02:00',
    name: 'Conta de luz',
    direction: 'DEBIT',
    origin: 'EXPENSE',
    value: 218.35,
    previousBalance: 5000,
    resultingBalance: 4781.65,
    financialPeriod: { id: 'p-1', name: 'Novembro' },
    reference: { type: 'MOVEMENT', id: 'm-1' },
  },
  {
    id: 'e-2',
    createdOn: '2026-11-19T10:00:00',
    name: 'Estorno de Academia',
    direction: 'CREDIT',
    origin: 'REVERSAL',
    value: 129.9,
    previousBalance: 4900,
    resultingBalance: 5029.9,
    financialPeriod: null,
    reference: null,
  },
  {
    id: 'e-3',
    createdOn: '2026-11-18T10:00:00',
    name: 'Ajuste de saldo',
    direction: 'CREDIT',
    origin: 'ADJUSTMENT',
    value: 0.03,
    previousBalance: 4899.97,
    resultingBalance: 4900,
    financialPeriod: null,
    reference: { type: 'TRANSFER', id: 't-1' },
  },
]

function serve(content = entries, walletList = wallets) {
  vi.mocked(walletsApi.findAll).mockResolvedValue(pageOf(walletList as never[]))
  vi.mocked(walletsApi.findById).mockResolvedValue({ currentBalance: 4781.65 } as WalletView)
  vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(
    pageOf([{ id: 'p-1', name: 'Novembro' }] as never[]),
  )
  vi.mocked(costCentersApi.findAll).mockResolvedValue(pageOf([]))
  vi.mocked(classificationsApi.findAll).mockResolvedValue(pageOf([]))
  vi.mocked(walletEntriesApi.findStatement).mockResolvedValue(pageOf(content))
}

function calls() {
  return vi.mocked(walletEntriesApi.findStatement).mock.calls
}

function lastQuery(): StatementQuery {
  return calls().slice(-1)[0]![1]
}

async function render(location?: string, content = entries, walletList = wallets) {
  serve(content, walletList)
  return mountView(StatementView, 'statement', {}, {}, location)
}

function selects(wrapper: Awaited<ReturnType<typeof render>>['wrapper']) {
  return wrapper.findAllComponents(FilterSelect)
}

describe('StatementView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('opens on the first active wallet and writes it to the URL', async () => {
    const { wrapper, router } = await render()

    expect(wrapper.find('h1').text()).toBe('Extrato')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe(
      'Mudanças de saldo de Conta corrente.',
    )
    expect(calls()[0]![0]).toBe('w-1')
    expect(router.currentRoute.value.query).toEqual({ wallet: 'w-1' })
    expect(wrapper.find('[data-slot="balance"]').text()).toMatch(/R\$\s4\.781,65/)
    expect(wrapper.text()).toContain('Conta Bancária, Banco')
  })

  it('lists the entries with the direction as sign, the balances and the link to the origin', async () => {
    const { wrapper } = await render()

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(3)
    expect(rows[0]!.text()).toContain('20/11/2026')
    expect(rows[0]!.text()).toContain('14:02')
    expect(rows[0]!.text()).toContain('Despesa')
    expect(rows[0]!.text()).toMatch(/−\sR\$\s218,35/)
    expect(rows[0]!.text()).toMatch(/R\$\s5\.000,00/)
    expect(rows[0]!.text()).toMatch(/R\$\s4\.781,65/)
    expect(rows[0]!.find('a[href="/financial/movements/m-1/detail"]').exists()).toBe(true)
    expect(rows[1]!.text()).toContain('Estorno')
    expect(rows[1]!.text()).toMatch(/\+\sR\$\s129,90/)
    expect(rows[1]!.attributes('data-state')).toBe('selected')
    expect(rows[0]!.attributes('data-state')).toBeUndefined()
    expect(rows[2]!.find('a[href*="/financial/transfers"]').exists()).toBe(false)
    expect(rows[2]!.text()).toContain('—')
  })

  it('opens with the state of the URL, which stays there', async () => {
    const location =
      '/statement?wallet=w-1&status=CREDIT&filter=luz&from=2026-11-01&to=2026-11-30&period=p-1&origin=EXPENSE&min=10&max=500&sort=value,asc'

    const { router } = await render(location)

    expect(calls()[0]![1]).toEqual({
      filter: 'luz',
      direction: 'CREDIT',
      from: '2026-11-01',
      to: '2026-11-30',
      financialPeriod: 'p-1',
      origins: ['EXPENSE'],
      minValue: 10,
      maxValue: 500,
      page: 0,
      size: 15,
      sort: 'value,asc',
    })
    expect(router.currentRoute.value.fullPath).toBe(location)
  })

  it('ignores an unknown operation and a value that is not a number', async () => {
    await render('/statement?wallet=w-1&origin=BOGUS&min=abc')

    expect(lastQuery().origins).toBeUndefined()
    expect(lastQuery().minValue).toBeUndefined()
  })

  it('reloads with each filter and clears them', async () => {
    const { wrapper } = await render('/statement?wallet=w-1')

    await wrapper.find('#statement-from').setValue('2026-11-01')
    await flushPromises()
    expect(lastQuery().from).toBe('2026-11-01')

    await wrapper.find('#statement-to').setValue('2026-11-30')
    await flushPromises()
    expect(lastQuery().to).toBe('2026-11-30')

    selects(wrapper)[1]!.vm.$emit('update:modelValue', 'p-1')
    await flushPromises()
    expect(lastQuery().financialPeriod).toBe('p-1')

    selects(wrapper)[2]!.vm.$emit('update:modelValue', 'TRANSFER')
    await flushPromises()
    expect(lastQuery().origins).toEqual(['TRANSFER'])

    await wrapper.find('#statement-min').setValue('5')
    await wrapper.find('#statement-max').setValue('50')
    await flushPromises()
    expect(lastQuery()).toMatchObject({ minValue: 5, maxValue: 50 })

    await buttonWithText(wrapper, 'Créditos').trigger('click')
    await flushPromises()
    expect(lastQuery().direction).toBe('CREDIT')

    await buttonWithText(wrapper, 'Limpar').trigger('click')
    await flushPromises()
    expect(lastQuery()).toMatchObject({
      from: undefined,
      to: undefined,
      financialPeriod: undefined,
      origins: undefined,
      minValue: undefined,
      maxValue: undefined,
    })
  })

  it('changes the wallet and reads its balance', async () => {
    const { wrapper } = await render('/statement?wallet=w-1')

    vi.mocked(walletsApi.findById).mockResolvedValue({ currentBalance: -50 } as WalletView)
    selects(wrapper)[0]!.vm.$emit('update:modelValue', 'w-2')
    await flushPromises()

    expect(calls().slice(-1)[0]![0]).toBe('w-2')
    expect(walletsApi.findById).toHaveBeenLastCalledWith('w-2')
    expect(wrapper.find('[data-slot="balance"]').text()).toMatch(/R\$\s50,00/)
    expect(wrapper.text()).toContain('Investimento')
  })

  it('sorts, searches and clears the search', async () => {
    const { wrapper } = await render('/statement?wallet=w-1')

    await buttonWithText(wrapper, 'Valor (R$)').trigger('click')
    await flushPromises()
    expect(lastQuery().sort).toBe('value,asc')

    await wrapper.find('input').setValue('luz')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(lastQuery()).toMatchObject({ filter: 'luz', page: 0 })

    await wrapper.find('button[aria-label="Limpar filtro"]').trigger('click')
    await flushPromises()
    expect(lastQuery().filter).toBeUndefined()
  })

  it('goes to the next page and changes the page size', async () => {
    const { wrapper } = await render('/statement?wallet=w-1')
    vi.mocked(walletEntriesApi.findStatement).mockResolvedValue(pageOf(entries, 40))
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    await wrapper.find('button[aria-label="Próxima página"]').trigger('click')
    await flushPromises()

    expect(lastQuery()).toMatchObject({ page: 1, size: 15 })
  })

  it('shows the empty state when the wallet has no entries', async () => {
    const { wrapper } = await render('/statement?wallet=w-1', [])

    expect(wrapper.find('[data-state="empty"]').text()).toContain('Sem lançamentos ainda')
    expect(wrapper.find('[data-state="empty"] button').exists()).toBe(false)
  })

  it('shows the empty state without wallets and loads nothing', async () => {
    const { wrapper } = await render(undefined, entries, [])

    expect(wrapper.find('[data-state="empty"]').exists()).toBe(true)
    expect(walletEntriesApi.findStatement).not.toHaveBeenCalled()
  })

  it('says nothing matched the filters and clears them', async () => {
    const { wrapper } = await render('/statement?wallet=w-1&origin=INCOME', [])

    expect(wrapper.find('[data-state="no-result"]').exists()).toBe(true)
    await wrapper.find('[data-state="no-result"] button').trigger('click')
    await flushPromises()

    expect(calls().length).toBeGreaterThan(1)
  })

  it('shows the error state and retries', async () => {
    serve()
    vi.mocked(walletEntriesApi.findStatement).mockRejectedValue(problem(500))
    const { wrapper } = await mountView(StatementView, 'statement')
    expect(wrapper.find('[data-state="error"]').exists()).toBe(true)

    vi.mocked(walletEntriesApi.findStatement).mockResolvedValue(pageOf(entries))
    await wrapper.find('[data-state="error"] button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-state="error"]').exists()).toBe(false)
  })

  it('shows the server error when the options cannot be loaded', async () => {
    serve()
    vi.mocked(financialPeriodsApi.findAll).mockRejectedValue(problem(500))

    const { wrapper } = await mountView(StatementView, 'statement')

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
  })

  it('shows the server error when the balance cannot be read', async () => {
    serve()
    vi.mocked(walletsApi.findById).mockRejectedValue(problem(500))

    const { wrapper } = await mountView(StatementView, 'statement')

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
    expect(buttonWithText(wrapper, 'Ajustar saldo').attributes('disabled')).toBeDefined()
  })

  it('adjusts the balance from the dialog and reloads', async () => {
    vi.mocked(walletEntriesApi.adjust).mockResolvedValue(entries[2]!)
    const { wrapper } = await render('/statement?wallet=w-1')

    await buttonWithText(wrapper, 'Ajustar saldo').trigger('click')
    const dialog = wrapper.getComponent(AdjustBalanceDialog)
    expect(dialog.props('wallet')).toEqual({ id: 'w-1', name: 'Conta corrente', balance: 4781.65 })

    const before = calls().length
    dialog.vm.$emit('adjust', dialog.props('wallet'), { value: 0.03, name: 'Arredondamento' })
    await flushPromises()

    expect(walletEntriesApi.adjust).toHaveBeenCalledWith('w-1', {
      value: 0.03,
      name: 'Arredondamento',
    })
    expect(toast.success).toHaveBeenCalledWith('Saldo ajustado', expect.anything())
    expect(dialog.props('wallet')).toBeNull()
    expect(calls().length).toBe(before + 1)
  })

  it('keeps the dialog open and shows the error when the adjustment fails', async () => {
    vi.mocked(walletEntriesApi.adjust).mockRejectedValue(
      problem(400, { error: 'invalid-adjustment-value' }),
    )
    const { wrapper } = await render('/statement?wallet=w-1')

    await buttonWithText(wrapper, 'Ajustar saldo').trigger('click')
    const dialog = wrapper.getComponent(AdjustBalanceDialog)
    dialog.vm.$emit('adjust', dialog.props('wallet'), { value: 0, name: 'x' })
    await flushPromises()

    expect(dialog.props('wallet')).not.toBeNull()
    expect(wrapper.find('[data-slot="server-error"]').text()).toContain('zero')
  })

  it('closes the dialog without adjusting', async () => {
    const { wrapper } = await render('/statement?wallet=w-1')

    await buttonWithText(wrapper, 'Ajustar saldo').trigger('click')
    wrapper.getComponent(AdjustBalanceDialog).vm.$emit('close')
    await flushPromises()

    expect(wrapper.getComponent(AdjustBalanceDialog).props('wallet')).toBeNull()
  })

  it('does not offer to adjust an inactive wallet', async () => {
    const { wrapper } = await render('/statement?wallet=w-2')

    expect(buttonWithText(wrapper, 'Ajustar saldo').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Poupança antiga (inativa)')
  })
})
