import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { classificationsApi } from '@/api/classifications'
import type { ClassificationListView, ClassificationView } from '@/types'
import { useClassificationsStore } from './classifications'

vi.mock('@/api/classifications')

const row: ClassificationListView = {
  id: 'cl-1',
  name: 'Salary',
  type: 'INCOME',
  active: true,
  generic: false,
}
const view: ClassificationView = { ...row, description: 'Monthly salary' }
const page = { content: [row], page: { size: 15, number: 0, totalElements: 1, totalPages: 1 } }

describe('useClassificationsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('lists active classifications sorted by creation', async () => {
    vi.mocked(classificationsApi.findAll).mockResolvedValue(page)
    const store = useClassificationsStore()

    await store.findAll()

    expect(classificationsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', sort: 'createdOn,desc' }),
    )
    expect(store.pageResponse.content).toEqual([row])
  })

  it('creates, loads, edits and removes a classification', async () => {
    vi.mocked(classificationsApi.create).mockResolvedValue('new-id')
    vi.mocked(classificationsApi.findById).mockResolvedValue(view)
    vi.mocked(classificationsApi.update).mockResolvedValue({ ...view, description: 'Monthly pay' })
    vi.mocked(classificationsApi.remove).mockResolvedValue()
    const store = useClassificationsStore()

    await store.create({ name: 'Salary', type: 'INCOME', generic: false })
    expect(classificationsApi.create).toHaveBeenCalledWith({
      name: 'Salary',
      type: 'INCOME',
      generic: false,
    })

    await store.findOne('cl-1')
    expect(store.classification).toEqual(view)

    await store.update('cl-1', {
      name: 'Salary',
      description: 'Monthly pay',
      active: true,
      generic: false,
    })
    expect(store.classification?.description).toBe('Monthly pay')

    await store.remove('cl-1')
    expect(store.classification).toBeNull()
  })

  it('reset() clears the current classification and the listing', async () => {
    vi.mocked(classificationsApi.findAll).mockResolvedValue(page)
    vi.mocked(classificationsApi.findById).mockResolvedValue(view)
    const store = useClassificationsStore()
    await store.findAll()
    await store.findOne('cl-1')

    store.reset()

    expect(store.classification).toBeNull()
    expect(store.pageResponse.content).toEqual([])
  })
})
