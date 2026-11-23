import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cardPurchasesApi } from '@/api/cardPurchases'
import { useCardPurchasesStore } from '@/stores/cardPurchases'
import type { CardPurchaseView } from '@/types'

vi.mock('@/api/cardPurchases')

const purchase = { id: 'cp-1', name: 'Mercado' } as CardPurchaseView

describe('useCardPurchasesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads, edits and removes a purchase and creates one', async () => {
    vi.mocked(cardPurchasesApi.findById).mockResolvedValue(purchase)
    vi.mocked(cardPurchasesApi.update).mockResolvedValue({ ...purchase, name: 'Posto' })
    vi.mocked(cardPurchasesApi.create).mockResolvedValue('cp-2')
    vi.mocked(cardPurchasesApi.remove).mockResolvedValue()
    const store = useCardPurchasesStore()

    await store.findOne('cp-1')
    expect(store.purchase).toEqual(purchase)

    await store.update('cp-1', {
      name: 'Posto',
      purchasedOn: null,
      value: 1,
      classification: 'a',
      costCenter: 'b',
    })
    expect(store.purchase?.name).toBe('Posto')

    await expect(
      store.create({
        name: 'x',
        purchasedOn: null,
        value: 1,
        card: 'c',
        financialPeriod: 'p',
        classification: 'a',
        costCenter: 'b',
      }),
    ).resolves.toBe('cp-2')

    await store.remove('cp-1')
    expect(store.purchase).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('stops loading when a call fails and forgets the purchase on reset', async () => {
    vi.mocked(cardPurchasesApi.findById).mockResolvedValueOnce(purchase)
    const store = useCardPurchasesStore()
    await store.findOne('cp-1')
    vi.mocked(cardPurchasesApi.remove).mockRejectedValue(new Error('boom'))

    await expect(store.remove('cp-1')).rejects.toThrow('boom')
    expect(store.loading).toBe(false)

    store.reset()
    expect(store.purchase).toBeNull()
  })
})
