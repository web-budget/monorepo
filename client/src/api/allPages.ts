import type { PagedResponse, PageQuery } from '@/types'

export const ALL_PAGES_SIZE = 100

export async function findAllPages<T>(
  findPage: (query: PageQuery) => Promise<PagedResponse<T>>,
  query: PageQuery = {},
): Promise<T[]> {
  const content: T[] = []
  let pageNumber = 0
  let totalPages = 1
  while (pageNumber < totalPages) {
    const response = await findPage({ ...query, size: ALL_PAGES_SIZE, page: pageNumber })
    content.push(...response.content)
    totalPages = response.page.totalPages
    pageNumber++
  }
  return content
}
