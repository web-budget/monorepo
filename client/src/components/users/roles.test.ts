import { describe, expect, it } from 'vitest'
import { sortRoles } from '@/components/users/roles'

describe('sortRoles', () => {
  it('orders the areas as the menu does and keeps unknown ones last', () => {
    expect(sortRoles(['ADMINISTRATION', 'EXTRA', 'DASHBOARDS', 'REGISTRATION'])).toEqual([
      'DASHBOARDS',
      'REGISTRATION',
      'ADMINISTRATION',
      'EXTRA',
    ])
  })
})
