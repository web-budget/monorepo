import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { importsApi } from '@/api/imports'
import { toImportLineQuery, useImportsStore } from '@/stores/imports'
import { problem } from '@/test/crud'
import type { ImportCandidateView, ImportLineView, ImportView } from '@/types'
import { createPageRequest, toPageQuery } from '@/utils/pageRequest'

vi.mock('@/api/imports')

const line = { id: 'l-1', name: 'Posto' } as ImportLineView
const page = { content: [line], page: { size: 15, number: 0, totalElements: 1, totalPages: 1 } }

describe('toImportLineQuery', () => {
  const query = toPageQuery(createPageRequest({ status: 'ALL', sortField: 'postedOn', direction: 'asc' }))

  it('leaves out what is not filled', () => {
    expect(toImportLineQuery(query)).toEqual({
      filter: undefined,
      pending: undefined,
      actions: undefined,
      page: 0,
      size: 15,
      sort: 'postedOn,asc',
    })
  })

  it('asks for the lines to resolve, the ignored ones and the text', () => {
    expect(toImportLineQuery({ ...query, status: 'PENDING', filter: 'posto' })).toMatchObject({
      filter: 'posto',
      pending: true,
      actions: undefined,
    })
    expect(toImportLineQuery({ ...query, status: 'IGNORED' })).toMatchObject({
      pending: undefined,
      actions: ['IGNORE'],
    })
  })
})

describe('useImportsStore lines', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('opens on the lines to resolve ordered by date and loads the page', async () => {
    vi.mocked(importsApi.findLines).mockResolvedValue(page)
    const store = useImportsStore()

    expect(store.lineRequest).toMatchObject({ status: 'PENDING', sortField: 'postedOn', direction: 'asc' })

    await store.findLines('i-1')

    expect(importsApi.findLines).toHaveBeenCalledWith('i-1', {
      filter: undefined,
      pending: true,
      actions: undefined,
      page: 0,
      size: 15,
      sort: 'postedOn,asc',
    })
    expect(store.lineResponse.content).toEqual([line])
    expect(store.lineResponse.totalElements).toBe(1)
  })

  it('passes the line changes to the server and returns the updated line', async () => {
    vi.mocked(importsApi.updateLine).mockResolvedValue(line)
    vi.mocked(importsApi.updateLines).mockResolvedValue()
    const store = useImportsStore()

    expect(await store.updateLine('i-1', 'l-1', { action: 'IGNORE' })).toEqual(line)
    await store.updateLines('i-1', { lines: ['l-1'], action: 'IGNORE' })

    expect(importsApi.updateLine).toHaveBeenCalledWith('i-1', 'l-1', { action: 'IGNORE' })
    expect(importsApi.updateLines).toHaveBeenCalledWith('i-1', { lines: ['l-1'], action: 'IGNORE' })
  })

  it('lists the candidates of a line', async () => {
    const candidate = { id: 'm-1' } as ImportCandidateView
    vi.mocked(importsApi.candidates).mockResolvedValue([candidate])

    expect(await useImportsStore().candidates('i-1', 'l-1')).toEqual([candidate])
    expect(importsApi.candidates).toHaveBeenCalledWith('i-1', 'l-1')
  })

  it('keeps the saved import as the current one', async () => {
    const saved = { id: 'i-1', status: 'SAVED' } as ImportView
    vi.mocked(importsApi.save).mockResolvedValue(saved)
    const store = useImportsStore()

    expect(await store.save('i-1')).toEqual(saved)
    expect(store.current).toEqual(saved)
  })

  it('is loading while a line request runs and stops when it fails', async () => {
    vi.mocked(importsApi.findLines).mockRejectedValue(problem(500))
    const store = useImportsStore()

    const loading = store.findLines('i-1')
    expect(store.loading).toBe(true)

    await expect(loading).rejects.toBeDefined()
    expect(store.loading).toBe(false)
  })

  it('goes back to the start, lines included, on reset', async () => {
    vi.mocked(importsApi.findLines).mockResolvedValue(page)
    const store = useImportsStore()
    await store.findLines('i-1')
    store.lineRequest.status = 'ALL'

    store.reset()

    expect(store.lineRequest.status).toBe('PENDING')
    expect(store.lineResponse.content).toEqual([])
  })
})
