import { beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { walletEntriesApi } from '@/api/walletEntries'
import { mountView, problem } from '@/test/crud'
import type { ReconciliationView, WalletEntryView } from '@/types'
import StatementEntryView from '@/views/financial/statement/StatementEntryView.vue'

vi.mock('@/api/walletEntries')

const walletDetailRoute = {
  path: '/registration/wallets/:id/detail',
  name: 'wallets.detail',
  component: { render: () => h('div') },
}

const reconciliation: ReconciliationView = {
  id: 'r-1',
  createdOn: '2026-11-18T18:55:00',
  informedBalance: -12.5,
  walletBalance: 4812.34,
  difference: -4824.84,
  reason: 'Tarifa do banco',
  entryId: 'e-3',
}

const entry: WalletEntryView = {
  id: 'e-3',
  createdOn: '2026-11-18T19:00:00',
  name: 'Ajuste de saldo',
  direction: 'CREDIT',
  origin: 'ADJUSTMENT',
  value: 0.03,
  previousBalance: 4812.34,
  resultingBalance: 4812.37,
  financialPeriod: null,
  reference: null,
  wallet: { id: 'w-1', name: 'Conta corrente' },
}

async function render(view: WalletEntryView = entry) {
  vi.mocked(walletEntriesApi.findEntry).mockResolvedValue(view)
  return mountView(StatementEntryView, 'statement', { wallet: 'w-1', id: view.id }, {}, undefined, [
    walletDetailRoute,
  ])
}

describe('StatementEntryView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the entry with its operation next to the title and one section', async () => {
    const { wrapper } = await render()

    expect(walletEntriesApi.findEntry).toHaveBeenCalledWith('w-1', 'e-3')
    expect(wrapper.find('h1').text()).toBe('Ajuste de saldo')
    expect(wrapper.find('[data-slot="page-title"]').element.parentElement!.textContent).toContain(
      'Ajuste',
    )
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual(['Lançamento'])
    expect(wrapper.text()).toContain('18/11/2026 19:00')
    expect(wrapper.text()).toContain('Conta corrente')
    expect(wrapper.text()).toContain('Valor0,03')
    expect(wrapper.text()).not.toMatch(/[+−]/)
    expect(wrapper.find('[data-slot="currency"]').attributes('data-direction')).toBe('income')
    expect(wrapper.text()).toContain('4.812,34')
    expect(wrapper.text()).toContain('4.812,37')
    expect(wrapper.find('[data-slot="detail-footer"]').exists()).toBe(false)
  })

  it('shows a debit without a sign, in the expense color, and no actions', async () => {
    const { wrapper } = await render({ ...entry, direction: 'DEBIT', value: 0.02 })

    expect(wrapper.text()).toContain('Valor0,02')
    expect(wrapper.text()).not.toContain('−0,02')
    expect(wrapper.find('[data-slot="currency"]').attributes('data-direction')).toBe('expense')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('signs only the balances that are negative', async () => {
    const { wrapper } = await render({ ...entry, previousBalance: -4.5, resultingBalance: 0.2 })

    expect(wrapper.text()).toContain('Saldo anterior−4,50')
    expect(wrapper.text()).toContain('Saldo atual0,20')
  })

  it('shows the reconciliation of an adjustment after the entry, with the way to open it', async () => {
    const { wrapper } = await render({
      ...entry,
      direction: 'DEBIT',
      reference: { type: 'RECONCILIATION', id: 'r-1' },
      reconciliation,
    })

    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual([
      'Lançamento',
      'Conciliação',
    ])
    const section = wrapper.findAll('section')[1]!
    expect(section.text()).toContain('Conciliada em18/11/2026 18:55')
    expect(section.text()).toContain('Saldo informado−12,50')
    expect(section.text()).toContain('Saldo da carteira4.812,34')
    expect(section.text()).toContain('Diferença−4.824,84')
    expect(section.findAll('[data-direction="expense"]').slice(-1)[0]!.text()).toBe('−4.824,84')
    expect(section.text()).toContain('MotivoTarifa do banco')
    const footer = wrapper.find('[data-slot="detail-footer"]')
    expect(footer.text()).toBe('Abrir a conciliação')
    expect(footer.find('a').attributes('href')).toBe(
      '/registration/wallets/w-1/detail?reconciliation=r-1',
    )
  })

  it('shows a positive difference in the income color, without a sign', async () => {
    const { wrapper } = await render({
      ...entry,
      reference: { type: 'RECONCILIATION', id: 'r-1' },
      reconciliation: { ...reconciliation, difference: 12.4, informedBalance: 4824.74 },
    })

    const difference = wrapper.findAll('section')[1]!.find('[data-direction="income"]')
    expect(difference.text()).toBe('12,40')
  })

  it('leaves the section and the footer out of an old adjustment', async () => {
    const { wrapper } = await render({ ...entry, reconciliation: null })

    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual(['Lançamento'])
    expect(wrapper.find('[data-slot="detail-footer"]').exists()).toBe(false)
  })

  it('names a reversal like the statement does', async () => {
    const { wrapper } = await render({ ...entry, origin: 'REVERSAL', name: 'Academia' })

    expect(wrapper.find('h1').text()).toBe('Estorno de Academia')
  })

  it('shows only the title while the entry is loading', async () => {
    vi.mocked(walletEntriesApi.findEntry).mockReturnValue(new Promise(() => {}))
    const { wrapper } = await mountView(StatementEntryView, 'statement', {
      wallet: 'w-1',
      id: 'e-3',
    })

    expect(wrapper.find('h1').text()).toBe('Detalhando')
    expect(wrapper.find('dl').exists()).toBe(false)
  })

  it('shows the server error when the entry cannot be loaded', async () => {
    vi.mocked(walletEntriesApi.findEntry).mockRejectedValue(problem(404))
    const { wrapper } = await mountView(StatementEntryView, 'statement', {
      wallet: 'w-1',
      id: 'e-3',
    })

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
  })
})
