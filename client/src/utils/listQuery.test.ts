import { describe, expect, it } from 'vitest'
import {
  buildListQuery,
  parseListQuery,
  sameListQuery,
  sameListState,
  type ListQueryState,
} from '@/utils/listQuery'

const settings = {
  initialStatus: 'ACTIVE',
  statuses: ['ACTIVE', 'INACTIVE', 'ALL'],
  sortFields: ['name', 'type'],
}

const defaults: ListQueryState<string> = {
  filterText: '',
  status: 'ACTIVE',
  current: 0,
  size: 15,
  sortField: 'createdOn',
  direction: 'desc',
}

describe('parseListQuery', () => {
  it('falls back to the defaults when the query is empty', () => {
    expect(parseListQuery({}, settings)).toEqual(defaults)
  })

  it('reads every parameter', () => {
    const query = { filter: 'Mai', status: 'ALL', page: '3', size: '30', sort: 'name,asc' }

    expect(parseListQuery(query, settings)).toEqual({
      filterText: 'Mai',
      status: 'ALL',
      current: 2,
      size: 30,
      sortField: 'name',
      direction: 'asc',
    })
  })

  it('takes the first value of a repeated parameter', () => {
    expect(parseListQuery({ filter: ['a', 'b'], status: ['ALL', 'INACTIVE'] }, settings)).toEqual({
      ...defaults,
      filterText: 'a',
      status: 'ALL',
    })
  })

  it.each([['NOPE'], ['active'], ['']])('ignores the unknown status "%s"', (status) => {
    expect(parseListQuery({ status }, settings).status).toBe('ACTIVE')
  })

  it.each([['0'], ['1'], ['-2'], ['abc'], ['2.5'], ['1234567890'], ['']])(
    'sends the invalid page "%s" to the first page',
    (page) => {
      expect(parseListQuery({ page }, settings).current).toBe(0)
    },
  )

  it.each([['7'], ['10'], ['abc'], ['']])('ignores the page size "%s"', (size) => {
    expect(parseListQuery({ size }, settings).size).toBe(15)
  })

  it.each([
    ['60', 60],
    ['15', 15],
  ])('accepts the page size %s', (size, expected) => {
    expect(parseListQuery({ size }, settings).size).toBe(expected)
  })

  it.each([['name,up'], ['name'], ['nope,asc'], ['name,asc,extra'], [',asc'], ['']])(
    'ignores the invalid sort "%s"',
    (sort) => {
      const parsed = parseListQuery({ sort }, settings)

      expect([parsed.sortField, parsed.direction]).toEqual(['createdOn', 'desc'])
    },
  )

  it('accepts the default sort field in the other direction', () => {
    const parsed = parseListQuery({ sort: 'createdOn,asc' }, settings)

    expect([parsed.sortField, parsed.direction]).toEqual(['createdOn', 'asc'])
  })
})

describe('buildListQuery', () => {
  it('leaves the default values out of the query', () => {
    expect(buildListQuery({}, defaults, 'ACTIVE')).toEqual({})
  })

  it('writes every value that is not the default', () => {
    const state: ListQueryState<string> = {
      filterText: 'Mai',
      status: 'ALL',
      current: 2,
      size: 30,
      sortField: 'name',
      direction: 'asc',
    }

    expect(buildListQuery({}, state, 'ACTIVE')).toEqual({
      filter: 'Mai',
      status: 'ALL',
      page: '3',
      size: '30',
      sort: 'name,asc',
    })
  })

  it('writes the default field in the other direction', () => {
    expect(buildListQuery({}, { ...defaults, direction: 'asc' }, 'ACTIVE')).toEqual({
      sort: 'createdOn,asc',
    })
  })

  it('writes a sort on another field in the default direction', () => {
    expect(buildListQuery({}, { ...defaults, sortField: 'name' }, 'ACTIVE')).toEqual({
      sort: 'name,desc',
    })
  })

  it('keeps the parameters that do not belong to the list and drops the stale ones', () => {
    const base = { from: 'email', status: 'ALL', page: '4', filter: 'old' }

    expect(buildListQuery(base, defaults, 'ACTIVE')).toEqual({ from: 'email' })
  })
})

describe('sameListQuery', () => {
  it('compares only the parameters of the list', () => {
    expect(sameListQuery({ status: 'ALL', from: 'a' }, { status: 'ALL', from: 'b' })).toBe(true)
    expect(sameListQuery({ status: 'ALL' }, {})).toBe(false)
    expect(sameListQuery({ page: ['2'] }, { page: '2' })).toBe(true)
  })
})

describe('sameListState', () => {
  const changes: Partial<ListQueryState<string>>[] = [
    { filterText: 'a' },
    { status: 'ALL' },
    { current: 1 },
    { size: 30 },
    { sortField: 'name' },
    { direction: 'asc' },
  ]

  it('is true for equal states', () => {
    expect(sameListState(defaults, { ...defaults })).toBe(true)
  })

  it.each(changes)('is false when %o differs', (change) => {
    expect(sameListState(defaults, { ...defaults, ...change })).toBe(false)
  })
})
