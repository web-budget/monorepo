import { beforeEach, describe, expect, it, vi } from 'vitest'
import { classificationsApi } from '@/api/classifications'
import { costCentersApi } from '@/api/costCenters'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { walletEntriesApi } from '@/api/walletEntries'
import { walletsApi } from '@/api/wallets'
import { mountView, pageOf } from '@/test/crud'
import type { WalletEntryView, WalletView } from '@/types'
import StatementEntryView from '@/views/financial/statement/StatementEntryView.vue'
import StatementView from '@/views/financial/statement/StatementView.vue'

vi.mock('@/api/walletEntries')
vi.mock('@/api/wallets')
vi.mock('@/api/transfers')
vi.mock('@/api/financialPeriods')
vi.mock('@/api/costCenters')
vi.mock('@/api/classifications')

const wallet = {
  id: 'w-1',
  name: 'Conta corrente',
  type: 'BANK_ACCOUNT',
  bank: 'Banco',
  active: true,
  lastEntryOn: null,
  currentBalance: 50,
  totalBalance: 1100,
  compartmentCount: 2,
}

const deposit: WalletEntryView = {
  id: 'e-1',
  createdOn: '2026-11-20T14:02:00',
  name: 'Emergency',
  direction: 'DEBIT',
  origin: 'COMPARTMENT',
  value: 350,
  previousBalance: 400,
  resultingBalance: 50,
  financialPeriod: null,
  reference: { type: 'COMPARTMENT', id: 'k-1', movementId: 'm-1' },
}

const withdrawal: WalletEntryView = {
  ...deposit,
  id: 'e-2',
  direction: 'CREDIT',
  previousBalance: 50,
  resultingBalance: 400,
  reference: { type: 'COMPARTMENT', id: 'k-1', movementId: 'm-2' },
}

const leaf = { render: () => null }

function serve(walletView: object = wallet, content: WalletEntryView[] = [deposit, withdrawal]) {
  vi.mocked(walletsApi.findAll).mockResolvedValue(pageOf([walletView] as never[]))
  vi.mocked(walletsApi.findById).mockResolvedValue({ currentBalance: 50 } as WalletView)
  vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf([]))
  vi.mocked(costCentersApi.findAll).mockResolvedValue(pageOf([]))
  vi.mocked(classificationsApi.findAll).mockResolvedValue(pageOf([]))
  vi.mocked(walletEntriesApi.findStatement).mockResolvedValue(pageOf(content))
  vi.mocked(walletEntriesApi.findSummary).mockResolvedValue({
    credits: { total: 350, count: 1 },
    debits: { total: 350, count: 1 },
    lastEntryOn: '2026-11-20T14:02:00',
  })
}

async function render(walletView: object = wallet, location = '/statement?wallet=w-1') {
  serve(walletView)
  return mountView(StatementView, 'statement', {}, {}, location, [
    { path: '/statement', name: 'statement.list', component: leaf },
  ])
}

describe('StatementView with piggy banks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the free balance with the total underneath when the wallet has piggy banks', async () => {
    const { wrapper } = await render()

    const card = wrapper.find('[data-slot="balance"]')
    expect(card.text()).toContain('Saldo livre')
    expect(card.text()).toMatch(/Total\s*R\$\s?1\.100,00/)
    expect(card.text()).toMatch(/R\$\s?50,00/)
    expect(card.text()).not.toContain('Atualizado em')
  })

  it('keeps the current balance with its date when the wallet has no piggy banks', async () => {
    const { wrapper } = await render({ ...wallet, compartmentCount: 0 })

    const card = wrapper.find('[data-slot="balance"]')
    expect(card.text()).toContain('Saldo atual')
    expect(card.text()).toContain('Atualizado em')
    expect(card.text()).not.toContain('Total')
  })

  it('names the lines by the direction and badges them as piggy bank operations', async () => {
    const { wrapper } = await render()

    const rows = wrapper.findAll('tbody tr')
    expect(rows[0]!.text()).toContain('Guardado em Emergency')
    expect(rows[0]!.text()).toContain('Cofrinho')
    expect(rows[1]!.text()).toContain('Resgatado de Emergency')
  })

  it('opens the history with the line marked from the arrow of the origin', async () => {
    const { wrapper, router } = await render()

    const link = wrapper.find('a[aria-label="Abrir a origem de Guardado em Emergency"]')
    expect(link.attributes('href')).toBe(
      '/registration/wallets/w-1/compartments/k-1/detail?movement=m-1',
    )

    await link.trigger('click')
    await new Promise((resolve) => setTimeout(resolve))

    expect(router.currentRoute.value.fullPath).toBe(
      '/registration/wallets/w-1/compartments/k-1/detail?movement=m-1',
    )
  })

  it('filters the statement by the piggy bank operation', async () => {
    await render(wallet, '/statement?wallet=w-1&origin=COMPARTMENT')

    expect(vi.mocked(walletEntriesApi.findStatement).mock.calls[0]![1]).toMatchObject({
      origins: ['COMPARTMENT'],
    })
  })
})

describe('StatementEntryView of a piggy bank line', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  const detailed: WalletEntryView = {
    ...deposit,
    wallet: { id: 'w-1', name: 'Conta corrente' },
    compartment: {
      id: 'k-1',
      name: 'Emergency',
      movementId: 'm-1',
      direction: 'DEPOSIT',
      note: 'Monthly',
    },
  }

  async function renderEntry(view: WalletEntryView) {
    vi.mocked(walletEntriesApi.findEntry).mockResolvedValue(view)
    return mountView(
      StatementEntryView,
      'statement',
      { wallet: 'w-1', id: view.id },
      {},
      undefined,
      [{ path: '/c/:id/:compartmentId', name: 'wallets.compartments.detail', component: leaf }],
    )
  }

  it('shows the piggy bank, the movement and the note, with a way to open it', async () => {
    const { wrapper } = await renderEntry(detailed)

    expect(wrapper.find('h1').text()).toBe('Guardado em Emergency')
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual(['Lançamento', 'Cofrinho'])
    expect(wrapper.text()).toContain('Guardado')
    expect(wrapper.text()).toContain('Monthly')
    const links = wrapper.findAll('a[href="/c/w-1/k-1"]')
    expect(links).toHaveLength(2)
    expect(wrapper.find('[data-slot="detail-footer"]').text()).toBe('Abrir o cofrinho')
  })

  it('tells a withdrawal and shows a dash for a missing note', async () => {
    const { wrapper } = await renderEntry({
      ...detailed,
      direction: 'CREDIT',
      compartment: { ...detailed.compartment!, direction: 'WITHDRAWAL', note: null },
    })

    expect(wrapper.find('h1').text()).toBe('Resgatado de Emergency')
    expect(wrapper.text()).toContain('Resgatado')
    expect(wrapper.text()).toContain('---')
  })
})
