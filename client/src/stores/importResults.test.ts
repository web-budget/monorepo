import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { importsApi } from '@/api/imports'
import { toImportResultQuery, useImportsStore } from '@/stores/imports'
import type { ImportLineView, ImportView } from '@/types'
import { createPageRequest, toPageQuery } from '@/utils/pageRequest'

vi.mock('@/api/imports')

const line = { id: 'l-1', name: 'Posto' } as ImportLineView
const page = { content: [line], page: { size: 15, number: 0, totalElements: 1, totalPages: 1 } }

describe('toImportResultQuery', () => {
  const query = toPageQuery(
    createPageRequest({ status: 'CREATED', sortField: 'postedOn', direction: 'asc' }),
  )

  it.each([
    ['CREATED', ['CREATE']],
    ['LINKED', ['LINK', 'INVOICE_PAYMENT']],
    ['RECURRING', ['LAUNCH_RECURRING', 'CREATE_RECURRING']],
    ['TRANSFERS', ['TRANSFER']],
    ['IGNORED', ['IGNORE']],
    ['ALL', undefined],
  ])('turns the %s tab into the actions it lists', (status, actions) => {
    expect(toImportResultQuery({ ...query, status })).toEqual({
      page: 0,
      size: 15,
      sort: 'postedOn,asc',
      actions,
    })
  })
})

describe('useImportsStore results', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('opens on the created lines ordered by date and loads the page', async () => {
    vi.mocked(importsApi.findLines).mockResolvedValue(page)
    const store = useImportsStore()

    expect(store.resultRequest).toMatchObject({
      status: 'CREATED',
      sortField: 'postedOn',
      direction: 'asc',
    })

    await store.findResults('i-1')

    expect(importsApi.findLines).toHaveBeenCalledWith('i-1', {
      page: 0,
      size: 15,
      sort: 'postedOn,asc',
      actions: ['CREATE'],
    })
    expect(store.resultResponse.content).toEqual([line])
  })

  it('keeps the undone import as the current one', async () => {
    const undone = { id: 'i-1', status: 'UNDONE' } as ImportView
    vi.mocked(importsApi.undo).mockResolvedValue(undone)
    const store = useImportsStore()

    expect(await store.undo('i-1')).toEqual(undone)
    expect(store.current).toEqual(undone)
    expect(importsApi.undo).toHaveBeenCalledWith('i-1')
  })

  it('goes back to the created lines on reset', async () => {
    vi.mocked(importsApi.findLines).mockResolvedValue(page)
    const store = useImportsStore()
    await store.findResults('i-1')
    store.resultRequest.status = 'ALL'

    store.reset()

    expect(store.resultRequest.status).toBe('CREATED')
    expect(store.resultResponse.content).toEqual([])
  })
})
