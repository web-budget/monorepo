import { beforeEach, describe, expect, it, vi } from 'vitest'
import { walletEntriesApi } from '@/api/walletEntries'
import { mountView, problem } from '@/test/crud'
import type { WalletEntryView } from '@/types'
import StatementEntryView from '@/views/financial/statement/StatementEntryView.vue'

vi.mock('@/api/walletEntries')

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
  return mountView(StatementEntryView, 'statement', { wallet: 'w-1', id: view.id })
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
    expect(wrapper.text()).toContain('+0,03')
    expect(wrapper.text()).toContain('4.812,34')
    expect(wrapper.text()).toContain('4.812,37')
    expect(wrapper.find('[data-slot="detail-footer"]').exists()).toBe(false)
  })

  it('shows a debit with its minus sign and no actions', async () => {
    const { wrapper } = await render({ ...entry, direction: 'DEBIT', value: 0.02 })

    expect(wrapper.text()).toContain('−0,02')
    expect(wrapper.find('button').exists()).toBe(false)
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
