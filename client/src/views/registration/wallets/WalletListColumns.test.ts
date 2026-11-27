import { beforeEach, describe, expect, it, vi } from 'vitest'
import { walletsApi } from '@/api/wallets'
import { mountView, pageOf } from '@/test/crud'
import type { PageQuery, WalletListView } from '@/types'
import WalletListView_ from '@/views/registration/wallets/WalletListView.vue'

vi.mock('@/api/wallets')

const wallets: WalletListView[] = [
  {
    id: 'w-1',
    name: 'Conta corrente',
    type: 'BANK_ACCOUNT',
    bank: 'Banco',
    agency: '123',
    number: '456',
    currentBalance: -50,
    totalBalance: 1100,
    compartmentCount: 2,
    active: true,
  },
  {
    id: 'w-2',
    name: 'Carteira',
    type: 'PERSONAL',
    bank: null,
    agency: null,
    number: null,
    currentBalance: 20,
    totalBalance: 20,
    compartmentCount: 0,
    active: true,
  },
]

async function render(location?: string) {
  vi.mocked(walletsApi.findAll).mockImplementation((query: PageQuery) =>
    Promise.resolve(query.size === 1 ? pageOf([], 2) : pageOf(wallets)),
  )
  return mountView(WalletListView_, 'wallets', {}, {}, location)
}

describe('WalletListView total and free balance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the total and the free balance, the free one always, in two sortable columns', async () => {
    const { wrapper } = await render()

    const headers = wrapper.findAll('thead th').map((header) => header.text())
    expect(headers).toContain('Total (R$)')
    expect(headers).toContain('Livre (R$)')

    const [first, second] = wrapper.findAll('tbody tr')
    expect(first!.text()).toContain('1.100,00')
    expect(first!.text()).toContain('−50,00')
    expect(first!.find('.text-expense').exists()).toBe(true)
    expect(second!.text().match(/20,00/g)).toHaveLength(2)
  })

  it('orders by the total and by the free balance on the URL', async () => {
    const { wrapper, router } = await render()

    const buttons = wrapper.findAll('thead th button')
    await buttons.find((button) => button.text().startsWith('Total'))!.trigger('click')
    await new Promise((resolve) => setTimeout(resolve))

    expect(router.currentRoute.value.query.sort).toBe('totalBalance,asc')

    await buttons.find((button) => button.text().startsWith('Livre'))!.trigger('click')
    await new Promise((resolve) => setTimeout(resolve))

    expect(router.currentRoute.value.query.sort).toBe('currentBalance,asc')
  })

  it('accepts the total order from a link', async () => {
    await render('/wallets?sort=totalBalance,desc')

    const listing = vi.mocked(walletsApi.findAll).mock.calls.find(([query]) => query.size !== 1)!
    expect(listing[0].sort).toBe('totalBalance,desc')
  })
})
