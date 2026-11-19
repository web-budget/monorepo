import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import UserAvatar from '@/components/users/UserAvatar.vue'

function initialsOf(name: string) {
  return mount(UserAvatar, { props: { name } }).text()
}

describe('UserAvatar', () => {
  it('uses the first letters of the first and the last name', () => {
    expect(initialsOf('Maria da Conceição')).toBe('MC')
  })

  it('uses the first two letters of a single name', () => {
    expect(initialsOf('bruno')).toBe('BR')
  })

  it('shows nothing for an empty name', () => {
    expect(initialsOf('  ')).toBe('')
  })
})
