import { describe, expect, it } from 'vitest'
import { crudRoutes } from '@/router/crudRoutes'

const view = () => Promise.resolve({})

describe('crudRoutes', () => {
  it('registers the list, the form routes and the detail', () => {
    const record = crudRoutes({
      path: 'things',
      name: 'things',
      entity: 'thing',
      list: view,
      form: view,
      detail: view,
    })

    expect(record.children?.map((child) => child.name)).toEqual([
      'things',
      'things.create',
      'things.update',
      'things.detail',
    ])
  })

  it('leaves the form routes out when there is no form', () => {
    const record = crudRoutes({
      path: 'things',
      name: 'things',
      entity: 'thing',
      list: view,
      detail: view,
    })

    expect(record.children?.map((child) => child.name)).toEqual(['things', 'things.detail'])
  })
})
