import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { importsApi } from '@/api/imports'
import { toImportQuery, useImportsStore } from '@/stores/imports'
import { problem } from '@/test/crud'
import type { ImportCounts, ImportListView, ImportView } from '@/types'
import { createPageRequest, toPageQuery } from '@/utils/pageRequest'

vi.mock('@/api/imports')

const item = { id: 'i-1', fileName: 'fatura.ofx' } as ImportListView
const page = { content: [item], page: { size: 15, number: 0, totalElements: 1, totalPages: 1 } }
const counts: ImportCounts = { processing: 1, ready: 2, failed: 3, saved: 4, undone: 5, total: 15 }

describe('toImportQuery', () => {
  const query = toPageQuery(createPageRequest({ status: 'ALL' }))

  it('leaves out what is not filled', () => {
    expect(toImportQuery(query, {})).toEqual({
      filter: undefined,
      statuses: undefined,
      card: undefined,
      wallet: undefined,
      financialPeriod: undefined,
      page: 0,
      size: 15,
      sort: 'createdOn,desc',
    })
  })

  it('translates the status, the text, the destination and the period', () => {
    expect(
      toImportQuery(
        { ...query, status: 'READY', filter: 'fatura' },
        { destination: 'card:c-1', period: 'p-1' },
      ),
    ).toMatchObject({
      filter: 'fatura',
      statuses: ['READY'],
      card: 'c-1',
      wallet: undefined,
      financialPeriod: 'p-1',
    })
    expect(toImportQuery(query, { destination: 'wallet:w-1' })).toMatchObject({
      card: undefined,
      wallet: 'w-1',
    })
    expect(toImportQuery({ ...query, status: undefined as never }, {}).statuses).toBeUndefined()
  })
})

describe('useImportsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('opens on the ready imports and loads the page with the filters of the store', async () => {
    vi.mocked(importsApi.findAll).mockResolvedValue(page)
    const store = useImportsStore()
    store.filters = { destination: 'card:c-1' }

    expect(store.pageRequest.status).toBe('READY')

    await store.findAll()

    expect(importsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ card: 'c-1', statuses: ['READY'] }),
    )
    expect(store.pageResponse.content).toEqual([item])
    expect(store.loading).toBe(false)
  })

  it('loads the counts, and gives up quietly when they fail', async () => {
    vi.mocked(importsApi.counts).mockResolvedValueOnce(counts)
    const store = useImportsStore()

    await store.loadCounts()

    expect(store.counts).toEqual(counts)

    vi.mocked(importsApi.counts).mockRejectedValueOnce(problem(500))

    await store.loadCounts()

    expect(store.counts).toBeNull()
  })

  it('loads one import, creates and removes', async () => {
    const current = { id: 'i-1' } as ImportView
    vi.mocked(importsApi.findById).mockResolvedValue(current)
    vi.mocked(importsApi.create).mockResolvedValue({ id: 'i-2' })
    vi.mocked(importsApi.remove).mockResolvedValue(undefined)
    const store = useImportsStore()

    await expect(store.findOne('i-1', true)).resolves.toEqual(current)
    await expect(store.create(new FormData())).resolves.toBe('i-2')
    await store.remove('i-1')

    expect(importsApi.findById).toHaveBeenCalledWith('i-1', true)
    expect(importsApi.remove).toHaveBeenCalledWith('i-1')
    expect(store.current).toEqual(current)
  })

  it('stops counting the loading when an operation fails, and resets', async () => {
    vi.mocked(importsApi.findAll).mockRejectedValue(problem(500))
    const store = useImportsStore()

    await expect(store.findAll()).rejects.toBeDefined()

    expect(store.loading).toBe(false)

    store.filters = { period: 'p-1' }
    store.reset()

    expect(store.filters).toEqual({})
    expect(store.current).toBeNull()
    expect(store.pageRequest.status).toBe('READY')
  })
})
