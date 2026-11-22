import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { useCardsStore } from '@/stores/cards'
import { useClassificationsStore } from '@/stores/classifications'
import { useCostCentersStore } from '@/stores/costCenters'
import { useWalletsStore } from '@/stores/wallets'
import { createTestPlugins } from '@/test/mounting'
import RegistrationHomeView from '@/views/registration/RegistrationHomeView.vue'

function render() {
  const { plugins } = createTestPlugins()
  const stores = {
    wallets: useWalletsStore(),
    cards: useCardsStore(),
    classifications: useClassificationsStore(),
    costCenters: useCostCentersStore(),
  }
  return { stores, mountView: () => mount(RegistrationHomeView, { global: { plugins } }) }
}

describe('RegistrationHomeView', () => {
  it('shows one shortcut per registration, with the unfiltered count of each', async () => {
    const { stores, mountView } = render()
    vi.mocked(stores.wallets.count).mockResolvedValue(6)
    vi.mocked(stores.cards.count).mockResolvedValue(4)
    vi.mocked(stores.classifications.count).mockResolvedValue(23)
    vi.mocked(stores.costCenters.count).mockResolvedValue(12)

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('[data-slot="page-title"]').text()).toBe('Cadastros')
    const cards = wrapper.findAll('a[data-slot="module-card"]')
    expect(cards.map((card) => card.attributes('href'))).toEqual([
      '/registration/wallets',
      '/registration/cards',
      '/registration/classifications',
      '/registration/cost-centers',
    ])
    expect(cards.map((card) => card.find('[data-slot="module-card-count"]').text())).toEqual([
      '6',
      '4',
      '23',
      '12',
    ])
    for (const store of Object.values(stores)) {
      expect(store.count).toHaveBeenCalledWith('ALL')
    }
  })

  it('shows the card without the count of the registration whose call failed', async () => {
    const { stores, mountView } = render()
    vi.mocked(stores.wallets.count).mockResolvedValue(null)
    vi.mocked(stores.cards.count).mockResolvedValue(4)
    vi.mocked(stores.classifications.count).mockResolvedValue(0)
    vi.mocked(stores.costCenters.count).mockResolvedValue(0)

    const wrapper = mountView()
    await flushPromises()

    const [wallets, cards] = wrapper.findAll('a[data-slot="module-card"]')
    expect(wallets!.text()).toContain('Carteiras')
    expect(wallets!.find('[data-slot="module-card-count"]').exists()).toBe(false)
    expect(cards!.find('[data-slot="module-card-count"]').text()).toBe('4')
  })
})
