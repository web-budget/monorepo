import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/client'
import { createPageRequest } from '@/utils/pageRequest'
import { isHandled } from '@/utils/handledErrors'
import { useCrudResource, type CrudApi } from './useCrudResource'

interface Row {
  id: string
  name: string
}

interface View extends Row {
  description: string
}

function pageOf(content: Row[]) {
  return { content, page: { size: 15, number: 0, totalElements: content.length, totalPages: 1 } }
}

function setup() {
  const api = {
    findAll: vi.fn<CrudApi<Row, View, object, object>['findAll']>(),
    findById: vi.fn<CrudApi<Row, View, object, object>['findById']>(),
    create: vi.fn<CrudApi<Row, View, object, object>['create']>(),
    update: vi.fn<CrudApi<Row, View, object, object>['update']>(),
    remove: vi.fn<CrudApi<Row, View, object, object>['remove']>(),
  }
  const resource = useCrudResource(api, () => createPageRequest<string>({ sortField: 'name' }))
  return { api, resource }
}

const rowA = { id: 'a', name: 'A' }
const rowB = { id: 'b', name: 'B' }
const viewA = { ...rowA, description: 'first' }

describe('useCrudResource', () => {
  it('starts with the initial page request and nothing loaded', () => {
    const { resource } = setup()

    expect(resource.pageRequest.value.sortField).toBe('name')
    expect(resource.pageResponse.value.content).toEqual([])
    expect(resource.current.value).toBeNull()
    expect(resource.loading.value).toBe(false)
  })

  it('loads a page with the query built from the page request', async () => {
    const { api, resource } = setup()
    api.findAll.mockResolvedValue({
      content: [rowA, rowB],
      page: { size: 2, number: 3, totalElements: 8, totalPages: 4 },
    })
    resource.pageRequest.value.filterText = 'x'
    resource.pageRequest.value.current = 3

    await resource.findAll()

    expect(api.findAll).toHaveBeenCalledWith({
      filter: 'x',
      status: 'ACTIVE',
      page: 3,
      size: 15,
      sort: 'name,asc',
    })
    expect(resource.pageResponse.value).toEqual({
      content: [rowA, rowB],
      size: 2,
      number: 3,
      totalElements: 8,
      totalPages: 4,
    })
  })

  it('reports loading while a request is in flight', async () => {
    const { api, resource } = setup()
    let resolve!: (value: ReturnType<typeof pageOf>) => void
    api.findAll.mockReturnValue(new Promise((done) => (resolve = done)))

    const loading = resource.findAll()
    expect(resource.loading.value).toBe(true)

    resolve(pageOf([]))
    await loading
    expect(resource.loading.value).toBe(false)
  })

  it('keeps loading until every concurrent request finishes', async () => {
    const { api, resource } = setup()
    let resolveFind!: (value: View) => void
    api.findById.mockReturnValue(new Promise((done) => (resolveFind = done)))
    api.findAll.mockResolvedValue(pageOf([]))

    const finding = resource.findOne('a')
    await resource.findAll()
    expect(resource.loading.value).toBe(true)

    resolveFind(viewA)
    await finding
    expect(resource.loading.value).toBe(false)
  })

  it('rethrows failures and stops loading', async () => {
    const { api, resource } = setup()
    const failure = new ApiError({ detail: 'boom' }, 500)
    api.findAll.mockRejectedValue(failure)

    await expect(resource.findAll()).rejects.toBe(failure)
    expect(resource.loading.value).toBe(false)
    expect(resource.pageResponse.value.content).toEqual([])
  })

  it('finds one record and keeps it as the current one', async () => {
    const { api, resource } = setup()
    api.findById.mockResolvedValue(viewA)

    await expect(resource.findOne('a')).resolves.toEqual(viewA)
    expect(api.findById).toHaveBeenCalledWith('a')
    expect(resource.current.value).toEqual(viewA)
  })

  it('creates through the API, returns the new id and does not touch the state', async () => {
    const { api, resource } = setup()
    api.create.mockResolvedValue('new-id')

    await expect(resource.create({ name: 'New' })).resolves.toBe('new-id')

    expect(api.create).toHaveBeenCalledWith({ name: 'New' })
    expect(resource.current.value).toBeNull()
  })

  it('counts the records of a status without touching the page, the filter or the loading flag', async () => {
    const { api, resource } = setup()
    resource.pageRequest.value.filterText = 'abc'
    resource.pageRequest.value.current = 3
    api.findAll.mockResolvedValue({
      content: [],
      page: { size: 1, number: 0, totalElements: 7, totalPages: 7 },
    })

    await expect(resource.count('INACTIVE')).resolves.toBe(7)

    expect(api.findAll).toHaveBeenCalledWith({
      filter: '',
      status: 'INACTIVE',
      page: 0,
      size: 1,
      sort: 'name,asc',
    })
    expect(resource.pageRequest.value.filterText).toBe('abc')
    expect(resource.pageRequest.value.current).toBe(3)
    expect(resource.loading.value).toBe(false)
  })

  it('gives no count, and no toast, when counting fails', async () => {
    const { api, resource } = setup()
    const failure = new ApiError(null, 500)
    api.findAll.mockRejectedValue(failure)

    await expect(resource.count('ALL')).resolves.toBeNull()

    expect(isHandled(failure)).toBe(true)
  })

  it('updates the current record only after the server answers', async () => {
    const { api, resource } = setup()
    const updated = { ...viewA, name: 'Edited' }
    api.update.mockResolvedValue(updated)

    await expect(resource.update('a', { name: 'Edited' })).resolves.toEqual(updated)
    expect(api.update).toHaveBeenCalledWith('a', { name: 'Edited' })
    expect(resource.current.value).toEqual(updated)
  })

  it('keeps the current record when the update fails', async () => {
    const { api, resource } = setup()
    api.findById.mockResolvedValue(viewA)
    api.update.mockRejectedValue(new ApiError({ error: 'conflict' }, 409))
    await resource.findOne('a')

    await expect(resource.update('a', { name: 'Edited' })).rejects.toBeInstanceOf(ApiError)
    expect(resource.current.value).toEqual(viewA)
  })

  it('drops a removed record from the page and the current one', async () => {
    const { api, resource } = setup()
    api.findAll.mockResolvedValue(pageOf([rowA, rowB]))
    api.findById.mockResolvedValue(viewA)
    api.remove.mockResolvedValue()
    await resource.findAll()
    await resource.findOne('a')

    await resource.remove('a')

    expect(api.remove).toHaveBeenCalledWith('a')
    expect(resource.pageResponse.value.content).toEqual([rowB])
    expect(resource.pageResponse.value.totalElements).toBe(1)
    expect(resource.current.value).toBeNull()
  })

  it('keeps the page totals when the removed record was not listed', async () => {
    const { api, resource } = setup()
    api.findAll.mockResolvedValue(pageOf([rowB]))
    api.remove.mockResolvedValue()
    await resource.findAll()

    await resource.remove('a')

    expect(resource.pageResponse.value.totalElements).toBe(1)
  })

  it('keeps the page when the removal fails', async () => {
    const { api, resource } = setup()
    api.findAll.mockResolvedValue(pageOf([rowA]))
    api.remove.mockRejectedValue(new ApiError({ error: 'data-integrity-violation' }, 400))
    await resource.findAll()

    await expect(resource.remove('a')).rejects.toBeInstanceOf(ApiError)
    expect(resource.pageResponse.value.content).toEqual([rowA])
  })

  it('resets back to the initial state', async () => {
    const { api, resource } = setup()
    api.findAll.mockResolvedValue(pageOf([rowA]))
    api.findById.mockResolvedValue(viewA)
    resource.pageRequest.value.filterText = 'x'
    await resource.findAll()
    await resource.findOne('a')

    resource.reset()

    expect(resource.pageRequest.value).toEqual(createPageRequest<string>({ sortField: 'name' }))
    expect(resource.pageResponse.value.content).toEqual([])
    expect(resource.current.value).toBeNull()
  })
})
