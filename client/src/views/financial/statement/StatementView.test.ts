import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { toast } from 'vue-sonner'
import { classificationsApi } from '@/api/classifications'
import { costCentersApi } from '@/api/costCenters'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { transfersApi } from '@/api/transfers'
import { reconciliationsApi } from '@/api/reconciliations'
import { walletEntriesApi } from '@/api/walletEntries'
import { walletsApi } from '@/api/wallets'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import GiveBackDialog from '@/components/transfers/GiveBackDialog.vue'
import ReconcileDialog from '@/components/wallets/ReconcileDialog.vue'
import { buttonWithText, mountView, pageOf, problem, useCompactViewport } from '@/test/crud'
import type {
  StatementQuery,
  StatementSummary,
  TransferView,
  WalletEntryView,
  WalletView,
} from '@/types'
import StatementView from '@/views/financial/statement/StatementView.vue'

vi.mock('@/api/walletEntries')
vi.mock('@/api/reconciliations')
vi.mock('@/api/wallets')
vi.mock('@/api/transfers')
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
  {
    id: 'w-1',
    name: 'Conta corrente',
    type: 'BANK_ACCOUNT',
    bank: 'Banco',
    active: true,
    lastEntryOn: null,
  },
  {
    id: 'w-2',
    name: 'Poupança antiga',
    type: 'INVESTMENT',
    bank: null,
    active: false,
    lastEntryOn: null,
  },
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
    name: 'Academia',
    direction: 'CREDIT',
    origin: 'REVERSAL',
    value: 129.9,
    previousBalance: 4900,
    resultingBalance: 5029.9,
    financialPeriod: null,
    reference: { type: 'MOVEMENT', id: 'm-2' },
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
    reference: null,
  },
  {
    id: 'e-4',
    createdOn: '2026-11-17T10:00:00',
    name: 'Poupança',
    direction: 'DEBIT',
    origin: 'TRANSFER',
    value: 3000,
    previousBalance: 7900,
    resultingBalance: 4900,
    financialPeriod: null,
    reference: { type: 'TRANSFER', id: 't-1', returnTransfer: false, returnable: true },
  },
  {
    id: 'e-5',
    createdOn: '2026-11-16T10:00:00',
    name: 'Conta digital',
    direction: 'CREDIT',
    origin: 'TRANSFER',
    value: 300,
    previousBalance: 7600,
    resultingBalance: 7900,
    financialPeriod: null,
    reference: { type: 'TRANSFER', id: 't-2', returnTransfer: false, returnable: false },
  },
  {
    id: 'e-6',
    createdOn: '2026-11-15T10:00:00',
    name: 'Conta digital',
    direction: 'DEBIT',
    origin: 'TRANSFER',
    value: 300,
    previousBalance: 7900,
    resultingBalance: 7600,
    financialPeriod: null,
    reference: { type: 'TRANSFER', id: 't-3', returnTransfer: true, returnable: false },
  },
  {
    id: 'e-7',
    createdOn: '2026-11-14T10:00:00',
    name: 'Conta digital',
    direction: 'CREDIT',
    origin: 'TRANSFER',
    value: 300,
    previousBalance: 7600,
    resultingBalance: 7900,
    financialPeriod: null,
    reference: { type: 'TRANSFER', id: 't-4', returnTransfer: true, returnable: false },
  },
]

const reconciledEntry: WalletEntryView = {
  id: 'e-8',
  createdOn: '2026-11-13T10:00:00',
  name: 'Tarifa do banco',
  direction: 'DEBIT',
  origin: 'ADJUSTMENT',
  value: 12.4,
  previousBalance: 100,
  resultingBalance: 87.6,
  financialPeriod: null,
  reference: { type: 'RECONCILIATION', id: 'r-1' },
}

const summary: StatementSummary = {
  credits: { total: 18886.53, count: 7 },
  debits: { total: 14074.16, count: 1 },
  lastEntryOn: '2026-11-20T10:05:00',
}

const transfer: TransferView = {
  id: 't-1',
  createdOn: '2026-11-17T10:00:00',
  value: 3000,
  description: null,
  fromWallet: { id: 'w-1', name: 'Conta corrente' },
  toWallet: { id: 'w-3', name: 'Poupança' },
  returnOf: null,
  returnedBy: null,
  returnable: true,
}

function serve(content = entries, walletList: object[] = wallets) {
  vi.mocked(walletsApi.findAll).mockResolvedValue(pageOf(walletList as never[]))
  vi.mocked(walletsApi.findById).mockResolvedValue({ currentBalance: 4781.65 } as WalletView)
  vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(
    pageOf([{ id: 'p-1', name: 'Novembro' }] as never[]),
  )
  vi.mocked(costCentersApi.findAll).mockResolvedValue(pageOf([]))
  vi.mocked(classificationsApi.findAll).mockResolvedValue(pageOf([]))
  vi.mocked(walletEntriesApi.findStatement).mockResolvedValue(pageOf(content))
  vi.mocked(walletEntriesApi.findSummary).mockResolvedValue(summary)
  vi.mocked(transfersApi.findById).mockResolvedValue(transfer)
}

function calls() {
  return vi.mocked(walletEntriesApi.findStatement).mock.calls
}

function lastQuery(): StatementQuery {
  return calls().slice(-1)[0]![1]
}

async function render(location?: string, content = entries, walletList: object[] = wallets) {
  serve(content, walletList)
  return mountView(StatementView, 'statement', {}, {}, location, extraRoutes)
}

const leaf = { render: () => h('div') }
const extraRoutes = [
  { path: '/transfers/:id/detail', name: 'transfers.detail', component: leaf },
  { path: '/movements/create', name: 'movements.create', component: leaf },
  { path: '/registration/wallets/:id/detail', name: 'wallets.detail', component: leaf },
  { path: '/imports/create', name: 'imports.create', component: leaf },
]

function selects(wrapper: Awaited<ReturnType<typeof render>>['wrapper']) {
  return wrapper.findAllComponents(FilterSelect)
}

describe('StatementView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(reconciliationsApi.findBalance).mockResolvedValue({
      freeBalance: 4781.65,
      totalBalance: 4781.65,
      compartments: [],
    })
    document.body.replaceChildren()
    useCompactViewport(false)
  })

  describe('the wallet it opens on', () => {
    it('is the active wallet with the most recent line', async () => {
      const { router } = await render(undefined, entries, [
        { ...wallets[0]!, lastEntryOn: '2026-11-10T10:00:00' },
        { ...wallets[0]!, id: 'w-3', name: 'Poupança', lastEntryOn: '2026-11-20T10:05:00' },
        { ...wallets[1]!, lastEntryOn: '2026-11-21T10:05:00' },
      ])

      expect(calls()[0]![0]).toBe('w-3')
      expect(router.currentRoute.value.query).toEqual({ wallet: 'w-3' })
    })

    it('is the first active wallet in alphabetical order when none has lines', async () => {
      const { router } = await render(undefined, entries, [
        { ...wallets[0]!, id: 'w-3', name: 'Poupança' },
        wallets[0]!,
      ])

      expect(calls()[0]![0]).toBe('w-1')
      expect(router.currentRoute.value.query).toEqual({ wallet: 'w-1' })
    })
  })

  it('introduces the wallet with the import first, then the reconciliation and the transfer', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Extrato')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe(
      'Mudanças de saldo de Conta corrente.',
    )
    expect(wrapper.find('[data-slot="page-actions"]').text()).toBe(
      'Importar extratoConciliarTransferir',
    )
    expect(wrapper.find('a[href="/financial/transfers/create?from=w-1"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/imports/create?wallet=w-1"]').exists()).toBe(true)
  })

  it('shows the wallet, the balance with its last update and the totals of the filter', async () => {
    const { wrapper } = await render()

    expect(wrapper.text()).toContain('Conta bancária, Banco')
    expect(wrapper.find('[data-slot="balance"]').text()).toMatch(/R\$\s4\.781,65/)
    expect(wrapper.find('[data-slot="balance"]').text()).toContain('Atualizado em 20/11/2026 10:05')
    expect(wrapper.find('[data-slot="credits"]').text()).toContain('Créditos no filtro')
    const credits = wrapper.find('[data-slot="credits"] [data-slot="currency"]')
    expect(credits.text()).toMatch(/^R\$\s18\.886,53$/)
    expect(credits.classes()).toContain('text-income')
    expect(wrapper.find('[data-slot="credits"]').text()).toContain('7 linhas')
    expect(wrapper.find('[data-slot="debits"]').text()).toContain('Débitos no filtro')
    const debits = wrapper.find('[data-slot="debits"] [data-slot="currency"]')
    expect(debits.text()).toMatch(/^R\$\s14\.074,16$/)
    expect(debits.classes()).toContain('text-expense')
    expect(wrapper.find('[data-slot="debits"]').text()).toContain('1 linha')
  })

  it('shows red when the balance is negative and no update date without lines', async () => {
    serve()
    vi.mocked(walletsApi.findById).mockResolvedValue({ currentBalance: -50 } as WalletView)
    vi.mocked(walletEntriesApi.findSummary).mockResolvedValue({
      credits: { total: 0, count: 0 },
      debits: { total: 0, count: 0 },
      lastEntryOn: null,
    })

    const { wrapper } = await mountView(StatementView, 'statement', {}, {}, undefined, extraRoutes)

    expect(wrapper.find('[data-slot="balance"] .text-expense').exists()).toBe(true)
    expect(wrapper.find('[data-slot="balance"]').text()).not.toContain('Atualizado')
    expect(wrapper.find('[data-slot="credits"]').text()).toContain('0 linhas')
  })

  it('puts the search, the tabs and the filters in one card', async () => {
    const { wrapper } = await render()

    const card = wrapper.find('[data-slot="filter-card"]')
    expect(card.find('input[type="text"]').exists()).toBe(true)
    expect(card.find('[data-slot="filters"]').exists()).toBe(true)
    expect(card.find('#statement-min').element.previousElementSibling?.textContent).toBe('R$')
  })

  describe('the lines', () => {
    it('shows the operation badge, the label, the signed values and the balances', async () => {
      const { wrapper } = await render()

      const rows = wrapper.findAll('tbody tr')
      expect(rows).toHaveLength(7)
      expect(rows[0]!.text()).toContain('20/11/2026 14:02')
      expect(rows[0]!.text()).toContain('Despesa')
      expect(rows[0]!.text()).toContain('Conta de luz')
      expect(rows[0]!.text()).toContain('218,35')
      expect(rows[0]!.text()).not.toMatch(/[−+]/)
      expect(rows[0]!.text()).not.toContain('R$')
      expect(rows[0]!.text()).toContain('5.000,00')
      expect(rows[0]!.text()).toContain('4.781,65')
      expect(rows[1]!.text()).toContain('Estorno de Academia')
      expect(rows[1]!.text()).toContain('129,90')
      expect(rows[1]!.text()).not.toMatch(/[−+]/)
      expect(rows[1]!.attributes('data-state')).toBe('selected')
      expect(rows[0]!.attributes('data-state')).toBeUndefined()
      expect(rows[2]!.text()).toContain('Ajuste')
      expect(rows[2]!.text()).toContain('Ajuste de saldo')
    })

    it('colors the value by direction, with no sign', async () => {
      const { wrapper } = await render()

      const rows = wrapper.findAll('tbody tr')
      expect(rows[0]!.find('[data-slot="currency"]').classes()).toContain('text-expense')
      expect(rows[1]!.find('[data-slot="currency"]').classes()).toContain('text-income')
    })

    it('signs and colors only a negative balance in the balance columns', async () => {
      const { wrapper } = await render(undefined, [
        { ...entries[0]!, previousBalance: -100, resultingBalance: -318.35 },
        { ...entries[1]!, previousBalance: -50, resultingBalance: 0 },
        { ...entries[2]!, previousBalance: 10, resultingBalance: 20 },
      ])

      const cells = (row: number) =>
        wrapper.findAll('tbody tr')[row]!.findAll('[data-slot="currency"]').slice(1)
      expect(cells(0).map((cell) => cell.text())).toEqual(['−100,00', '−318,35'])
      expect(cells(0).every((cell) => cell.classes().includes('text-expense'))).toBe(true)
      expect(cells(1).map((cell) => cell.text())).toEqual(['−50,00', '0,00'])
      expect(cells(1)[1]!.classes()).not.toContain('text-expense')
      expect(cells(2).map((cell) => cell.text())).toEqual(['10,00', '20,00'])
      expect(cells(2).some((cell) => cell.classes().includes('text-expense'))).toBe(false)
    })

    it('says to, from, return to and return from on the transfers', async () => {
      const { wrapper } = await render()

      const rows = wrapper.findAll('tbody tr')
      expect(rows[3]!.text()).toContain('Para Poupança')
      expect(rows[4]!.text()).toContain('De Conta digital')
      expect(rows[5]!.text()).toContain('Devolução para Conta digital')
      expect(rows[6]!.text()).toContain('Devolução de Conta digital')
    })

    it('names the invoice payment operation', async () => {
      const { wrapper } = await render(undefined, [{ ...entries[0]!, origin: 'INVOICE_PAYMENT' }])

      expect(wrapper.find('tbody tr').text()).toContain('Pagamento de fatura')
    })

    it('links to the origin from the last column, which has no visible title', async () => {
      const { wrapper } = await render()

      const rows = wrapper.findAll('tbody tr')
      expect(rows[0]!.find('a[href="/financial/movements/m-1/detail"]').exists()).toBe(true)
      expect(rows[0]!.find('a svg').classes()).toContain('lucide-arrow-up-right')
      expect(rows[3]!.find('a[href="/financial/transfers/t-1/detail"]').exists()).toBe(true)
      expect(rows[2]!.text()).toContain('—')
      expect(wrapper.find('th .sr-only').text()).toBe('Abrir origem')
    })

    it('opens the movement, the transfer or the entry itself from the row', async () => {
      const { wrapper, router } = await render()
      const rows = () => wrapper.findAll('tbody tr')

      await rows()[0]!.trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.fullPath).toBe('/financial/movements/m-1/detail')

      await router.push('/statement?wallet=w-1')
      await flushPromises()
      await rows()[3]!.trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.fullPath).toBe('/financial/transfers/t-1/detail')

      await router.push('/statement?wallet=w-1')
      await flushPromises()
      await rows()[2]!.trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.fullPath).toBe('/financial/statement/w-1/e-3/detail')
    })

    it('opens the origin from its link without going through the row', async () => {
      const { wrapper, router } = await render()

      await wrapper.find('a[href="/financial/movements/m-1/detail"]').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.fullPath).toBe('/financial/movements/m-1/detail')
    })

    it('leads the arrow of an adjustment with a reconciliation to the wallet, with the reconciliation open', async () => {
      const { wrapper } = await render(undefined, [...entries.slice(0, 3), reconciledEntry])

      const row = wrapper.findAll('tbody tr')[3]!
      expect(row.text()).toContain('Tarifa do banco')
      const link = row.find('a')
      expect(link.attributes('href')).toBe('/registration/wallets/w-1/detail?reconciliation=r-1')
      expect(link.attributes('aria-label')).toBe('Abrir a conciliação de Tarifa do banco')
      expect(link.find('svg').classes()).toContain('lucide-arrow-up-right')
    })

    it('opens the entry itself from the row of a reconciled adjustment, not the wallet', async () => {
      const { wrapper, router } = await render(undefined, [reconciledEntry])

      await wrapper.find('tbody tr').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.fullPath).toBe('/financial/statement/w-1/e-8/detail')
    })

    it('opens the wallet with the reconciliation from the arrow, without going through the row', async () => {
      const { wrapper, router } = await render(undefined, [reconciledEntry])

      await wrapper.find('tbody a').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.fullPath).toBe(
        '/registration/wallets/w-1/detail?reconciliation=r-1',
      )
    })

    it('offers to see the reconciliation on the card of the adjustment, and nothing else of the origin', async () => {
      useCompactViewport(true)

      const { wrapper } = await render(undefined, [reconciledEntry, ...entries.slice(0, 3)])

      const cards = wrapper.findAll('[data-layout="compact"] > div')
      expect(cards[0]!.find('a').text()).toBe('Ver conciliação')
      expect(cards[0]!.find('a').attributes('href')).toBe(
        '/registration/wallets/w-1/detail?reconciliation=r-1',
      )
      expect(cards[1]!.find('a').classes()).toContain('max-md:hidden')
      expect(cards[3]!.find('span[class*="max-md:hidden"]').exists()).toBe(true)
    })

    it('shows the lines as compact cards on a small screen', async () => {
      useCompactViewport(true)

      const { wrapper } = await render()

      const card = wrapper.find('[data-layout="compact"]')
      expect(card.text()).toContain('Conta de luz')
      expect(card.text()).toContain('Saldo anterior: 5.000,00')
      expect(card.text()).toContain('Saldo atual: 4.781,65')
    })
  })

  describe('giving a transfer back', () => {
    it('offers the button only on the transfers that can be returned', async () => {
      const { wrapper } = await render()

      const rows = wrapper.findAll('tbody tr')
      expect(rows[3]!.text()).toContain('Devolver')
      expect(rows[4]!.text()).not.toContain('Devolver')
      expect(rows[0]!.text()).not.toContain('Devolver')
    })

    it('opens the dialog with the transfer of the line and returns it', async () => {
      vi.mocked(transfersApi.giveBack).mockResolvedValue('t-9')
      const { wrapper, router } = await render()

      await wrapper.findAll('tbody tr')[3]!.find('button').trigger('click')
      await flushPromises()
      const dialog = wrapper.getComponent(GiveBackDialog)
      expect(transfersApi.findById).toHaveBeenCalledWith('t-1')
      expect(dialog.props('transfer')).toMatchObject({ id: 't-1' })

      dialog.vm.$emit('confirm', dialog.props('transfer'))
      await flushPromises()

      expect(transfersApi.giveBack).toHaveBeenCalledWith('t-1')
      expect(router.currentRoute.value.params.id).toBe('t-9')
    })

    it('closes the dialog without returning', async () => {
      const { wrapper } = await render()

      await wrapper.findAll('tbody tr')[3]!.find('button').trigger('click')
      await flushPromises()
      wrapper.getComponent(GiveBackDialog).vm.$emit('close')
      await flushPromises()

      expect(wrapper.getComponent(GiveBackDialog).props('transfer')).toBeNull()
      expect(transfersApi.giveBack).not.toHaveBeenCalled()
    })

    it('shows the server error when the transfer cannot be read', async () => {
      const { wrapper } = await render()
      vi.mocked(transfersApi.findById).mockRejectedValue(problem(500))

      await wrapper.findAll('tbody tr')[3]!.find('button').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
      expect(wrapper.getComponent(GiveBackDialog).props('transfer')).toBeNull()
    })
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
    expect(vi.mocked(walletEntriesApi.findSummary).mock.calls[0]![1]).toEqual({
      filter: 'luz',
      direction: 'CREDIT',
      from: '2026-11-01',
      to: '2026-11-30',
      financialPeriod: 'p-1',
      origins: ['EXPENSE'],
      minValue: 10,
      maxValue: 500,
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

    await wrapper.find('#statement-min').setValue('500')
    await wrapper.find('#statement-max').setValue('5000')
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
    expect(walletEntriesApi.findSummary).toHaveBeenLastCalledWith('w-2', expect.anything())
    expect(walletsApi.findById).toHaveBeenLastCalledWith('w-2')
    expect(wrapper.find('[data-slot="balance"]').text()).toMatch(/−R\$\s50,00/)
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

  it('marks the date column as sorted in the default order, as the design does', async () => {
    const { wrapper } = await render('/statement?wallet=w-1')

    expect(wrapper.find('th[aria-sort="descending"]').text()).toContain('Data e hora')
  })

  it('goes to the next page and changes the page size', async () => {
    const { wrapper } = await render('/statement?wallet=w-1')
    vi.mocked(walletEntriesApi.findStatement).mockResolvedValue(pageOf(entries, 40))
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    await wrapper.find('button[aria-label="Próxima página"]').trigger('click')
    await flushPromises()

    expect(lastQuery()).toMatchObject({ page: 1, size: 15 })
    expect(wrapper.text()).toContain('linhas')
  })

  describe('states', () => {
    it('says the wallet has no entries and offers to post a movement', async () => {
      const { wrapper, router } = await render('/statement?wallet=w-1', [])

      const state = wrapper.find('[data-state="empty"]')
      expect(state.text()).toContain('Conta corrente ainda não tem lançamentos')
      expect(state.text()).toContain('Lance uma receita para dar saldo.')

      await state.find('button').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.name).toBe('movements.create')
    })

    it('shows the empty state without wallets and loads nothing', async () => {
      const { wrapper } = await render(undefined, entries, [])

      expect(wrapper.find('[data-state="empty"]').exists()).toBe(true)
      expect(walletEntriesApi.findStatement).not.toHaveBeenCalled()
    })

    it('says nothing matched the filters and clears them', async () => {
      const { wrapper } = await render('/statement?wallet=w-1&origin=INCOME', [])

      const state = wrapper.find('[data-state="no-result"]')
      expect(state.text()).toContain('Nenhuma linha no extrato com esses filtros')
      expect(state.text()).toContain('Mude os filtros ou limpe a busca.')
      await state.find('button').trigger('click')
      await flushPromises()

      expect(calls().length).toBeGreaterThan(1)
    })

    it('names the search that found nothing', async () => {
      const { wrapper } = await render('/statement?wallet=w-1&filter=zzz', [])

      expect(wrapper.find('[data-state="no-result"]').text()).toContain(
        'Nenhuma linha no extrato encontrada para “zzz”',
      )
    })

    it('shows the error state with the design text and retries', async () => {
      serve()
      vi.mocked(walletEntriesApi.findStatement).mockRejectedValue(problem(500))
      const { wrapper } = await mountView(
        StatementView,
        'statement',
        {},
        {},
        undefined,
        extraRoutes,
      )
      const state = wrapper.find('[data-state="error"]')
      expect(state.text()).toContain('Não foi possível carregar o extrato')
      expect(state.text()).toContain('O servidor não respondeu. Seus filtros continuam na URL.')

      vi.mocked(walletEntriesApi.findStatement).mockResolvedValue(pageOf(entries))
      await state.find('button').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-state="error"]').exists()).toBe(false)
    })

    it('shows the server error when the options cannot be loaded', async () => {
      serve()
      vi.mocked(financialPeriodsApi.findAll).mockRejectedValue(problem(500))

      const { wrapper } = await mountView(
        StatementView,
        'statement',
        {},
        {},
        undefined,
        extraRoutes,
      )

      expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
    })

    it('shows the server error when the balance cannot be read', async () => {
      serve()
      vi.mocked(walletsApi.findById).mockRejectedValue(problem(500))

      const { wrapper } = await mountView(
        StatementView,
        'statement',
        {},
        {},
        undefined,
        extraRoutes,
      )

      expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
      expect(buttonWithText(wrapper, 'Conciliar').attributes('disabled')).toBeDefined()
    })
  })

  describe('reconciling the wallet', () => {
    it('reconciles from the dialog, tells the credit and reloads', async () => {
      vi.mocked(reconciliationsApi.reconcile).mockResolvedValue({
        reconciliation: { difference: 12.4 },
      } as never)
      const { wrapper } = await render('/statement?wallet=w-1')

      await buttonWithText(wrapper, 'Conciliar').trigger('click')
      await flushPromises()
      const dialog = wrapper.getComponent(ReconcileDialog)
      expect(dialog.props('wallet')).toEqual({
        id: 'w-1',
        name: 'Conta corrente',
        personal: false,
        balance: 4781.65,
        freeBalance: 4781.65,
        compartments: [],
      })
      expect(reconciliationsApi.findBalance).toHaveBeenCalledWith('w-1')

      const before = calls().length
      const form = { informedBalance: 4794.05, shownBalance: 4781.65, reason: 'Centavos' }
      dialog.vm.$emit('reconcile', dialog.props('wallet'), form)
      await flushPromises()

      expect(reconciliationsApi.reconcile).toHaveBeenCalledWith('w-1', form)
      expect(toast.success).toHaveBeenCalledWith('Carteira conciliada', {
        description: 'Ajuste de crédito de 12,40 em Conta corrente. Não entra no resultado.',
        duration: 4000,
      })
      expect(dialog.props('wallet')).toBeNull()
      expect(calls().length).toBe(before + 1)
    })

    it('keeps the dialog open and shows the error when the reconciliation fails', async () => {
      vi.mocked(reconciliationsApi.reconcile).mockRejectedValue(
        problem(400, { error: 'reconciliation-without-difference' }),
      )
      const { wrapper } = await render('/statement?wallet=w-1')

      await buttonWithText(wrapper, 'Conciliar').trigger('click')
      await flushPromises()
      const dialog = wrapper.getComponent(ReconcileDialog)
      dialog.vm.$emit('reconcile', dialog.props('wallet'), {
        informedBalance: 4781.65,
        shownBalance: 4781.65,
        reason: 'x',
      })
      await flushPromises()

      expect(dialog.props('wallet')).not.toBeNull()
      expect(dialog.props('messages').join(' ')).toContain('Não há o que conciliar')
      expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(false)
    })

    it('closes the dialog without reconciling', async () => {
      const { wrapper } = await render('/statement?wallet=w-1')

      await buttonWithText(wrapper, 'Conciliar').trigger('click')
      await flushPromises()
      wrapper.getComponent(ReconcileDialog).vm.$emit('close')
      await flushPromises()

      expect(wrapper.getComponent(ReconcileDialog).props('wallet')).toBeNull()
    })

    it('does not offer to reconcile an inactive wallet', async () => {
      const { wrapper } = await render('/statement?wallet=w-2')

      expect(buttonWithText(wrapper, 'Conciliar').attributes('disabled')).toBeDefined()
      expect(wrapper.text()).toContain('Poupança antiga (inativa)')
    })
  })
})
