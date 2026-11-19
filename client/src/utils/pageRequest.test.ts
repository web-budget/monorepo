import { describe, expect, it } from 'vitest'
import {
  createPageRequest,
  createPageResponse,
  DEFAULT_PAGE_SIZE,
  toPageQuery,
} from './pageRequest'

describe('createPageRequest', () => {
  it('defaults to the first page of active records sorted by creation', () => {
    expect(createPageRequest()).toEqual({
      filterText: '',
      status: 'ACTIVE',
      current: 0,
      size: DEFAULT_PAGE_SIZE,
      direction: 'desc',
      sortField: 'createdOn',
    })
  })

  it('applies overrides on top of the defaults', () => {
    expect(
      createPageRequest({ status: 'OPEN', direction: 'desc', sortField: 'startingAt' }),
    ).toMatchObject({
      status: 'OPEN',
      direction: 'desc',
      sortField: 'startingAt',
      size: DEFAULT_PAGE_SIZE,
    })
  })

  it('returns a new object on every call', () => {
    expect(createPageRequest()).not.toBe(createPageRequest())
  })
})

describe('createPageResponse', () => {
  it('starts empty', () => {
    expect(createPageResponse()).toEqual({
      content: [],
      size: DEFAULT_PAGE_SIZE,
      number: 0,
      totalElements: 0,
      totalPages: 0,
    })
  })
})

describe('toPageQuery', () => {
  it('maps the request onto the Spring paging parameters', () => {
    const request = createPageRequest({
      filterText: 'bank',
      status: 'inactive',
      current: 2,
      size: 30,
      direction: 'desc',
      sortField: 'name',
    })

    expect(toPageQuery(request)).toEqual({
      filter: 'bank',
      status: 'INACTIVE',
      page: 2,
      size: 30,
      sort: 'name,desc',
    })
  })
})
