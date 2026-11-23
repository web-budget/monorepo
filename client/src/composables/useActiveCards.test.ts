import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cardsApi } from '@/api/cards'
import { useActiveCards } from '@/composables/useActiveCards'
import { pageOf } from '@/test/crud'

vi.mock('@/api/cards')

describe('useActiveCards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads the active cards by name', async () => {
    vi.mocked(cardsApi.findAll).mockResolvedValue(pageOf([{ id: 'k-1', name: 'Visa' }] as never[]))
    const { cards, load } = useActiveCards()

    await load()

    expect(cardsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', sort: 'name,asc' }),
    )
    expect(cards.value).toEqual([{ id: 'k-1', name: 'Visa' }])
  })
})
