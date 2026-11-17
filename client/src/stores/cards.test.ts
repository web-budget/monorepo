import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { cardsApi } from '@/api/cards'
import type { CardListView, CardView } from '@/types'
import { useCardsStore } from './cards'

vi.mock('@/api/cards')

const row: CardListView = { id: 'c-1', name: 'Gold', type: 'CREDIT', active: true, flag: 'Visa' }
const view: CardView = { ...row, lastFourDigits: '1234', wallet: null, invoicePaymentDay: 10 }
const page = { content: [row], page: { size: 15, number: 0, totalElements: 1, totalPages: 1 } }

describe('useCardsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('lists active cards sorted by creation', async () => {
    vi.mocked(cardsApi.findAll).mockResolvedValue(page)
    const store = useCardsStore()

    await store.findAll()

    expect(cardsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', sort: 'createdOn,asc' }),
    )
    expect(store.pageResponse.content).toEqual([row])
  })

  it('creates, loads, edits and removes a card', async () => {
    vi.mocked(cardsApi.create).mockResolvedValue()
    vi.mocked(cardsApi.findById).mockResolvedValue(view)
    vi.mocked(cardsApi.update).mockResolvedValue({ ...view, flag: 'Master' })
    vi.mocked(cardsApi.remove).mockResolvedValue()
    const store = useCardsStore()

    await store.create({ name: 'Gold', lastFourDigits: '1234', type: 'CREDIT' })
    expect(cardsApi.create).toHaveBeenCalledWith({
      name: 'Gold',
      lastFourDigits: '1234',
      type: 'CREDIT',
    })

    await store.findOne('c-1')
    expect(store.card).toEqual(view)

    await store.update('c-1', {
      name: 'Gold',
      lastFourDigits: '1234',
      active: true,
      flag: 'Master',
    })
    expect(store.card?.flag).toBe('Master')

    await store.remove('c-1')
    expect(store.card).toBeNull()
  })

  it('reset() clears the current card and the listing', async () => {
    vi.mocked(cardsApi.findAll).mockResolvedValue(page)
    vi.mocked(cardsApi.findById).mockResolvedValue(view)
    const store = useCardsStore()
    await store.findAll()
    await store.findOne('c-1')

    store.reset()

    expect(store.card).toBeNull()
    expect(store.pageResponse.content).toEqual([])
  })
})
