import { describe, expect, it, vi } from 'vitest'
import { ALL_PAGES_SIZE, findAllPages } from '@/api/allPages'
import type { PagedResponse, PageQuery } from '@/types'

type Finder = (query: PageQuery) => Promise<PagedResponse<string>>

function page(content: string[], number: number, totalPages: number): PagedResponse<string> {
  return {
    content,
    page: { size: ALL_PAGES_SIZE, number, totalElements: 250, totalPages },
  }
}

describe('findAllPages', () => {
  it('requests every page in order and joins the content', async () => {
    const findPage = vi
      .fn<Finder>()
      .mockResolvedValueOnce(page(['a', 'b'], 0, 3))
      .mockResolvedValueOnce(page(['c', 'd'], 1, 3))
      .mockResolvedValueOnce(page(['e'], 2, 3))

    const content = await findAllPages(findPage, { status: 'ACTIVE', sort: 'name,asc' })

    expect(content).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(findPage.mock.calls.map(([query]) => query)).toEqual([
      { status: 'ACTIVE', sort: 'name,asc', size: ALL_PAGES_SIZE, page: 0 },
      { status: 'ACTIVE', sort: 'name,asc', size: ALL_PAGES_SIZE, page: 1 },
      { status: 'ACTIVE', sort: 'name,asc', size: ALL_PAGES_SIZE, page: 2 },
    ])
  })

  it('stops after the only page', async () => {
    const findPage = vi.fn<Finder>().mockResolvedValue(page(['a'], 0, 1))

    expect(await findAllPages(findPage)).toEqual(['a'])
    expect(findPage).toHaveBeenCalledTimes(1)
  })

  it('returns nothing when the first page is empty', async () => {
    const findPage = vi.fn<Finder>().mockResolvedValue(page([], 0, 0))

    expect(await findAllPages(findPage, { status: 'ACTIVE' })).toEqual([])
    expect(findPage).toHaveBeenCalledTimes(1)
  })

  it('propagates a failure from a later page', async () => {
    const failure = new Error('network')
    const findPage = vi
      .fn<Finder>()
      .mockResolvedValueOnce(page(['a'], 0, 2))
      .mockRejectedValueOnce(failure)

    await expect(findAllPages(findPage)).rejects.toBe(failure)
  })
})
