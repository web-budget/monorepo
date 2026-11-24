import { afterEach, describe, expect, it } from 'vitest'
import { useAccountDialog } from '@/composables/useAccountDialog'

describe('useAccountDialog', () => {
  afterEach(() => {
    useAccountDialog().close()
  })

  it('starts closed', () => {
    expect(useAccountDialog().open.value).toBe(false)
  })

  it('opens on the asked tab', () => {
    useAccountDialog().show('security')

    expect(useAccountDialog().open.value).toBe(true)
    expect(useAccountDialog().tab.value).toBe('security')
  })

  it('opens without a tab when none is asked', () => {
    useAccountDialog().show('password')
    useAccountDialog().show()

    expect(useAccountDialog().tab.value).toBeNull()
  })

  it('moves between the tabs and back to the list', () => {
    useAccountDialog().show('profile')

    useAccountDialog().select('preferences')
    expect(useAccountDialog().tab.value).toBe('preferences')

    useAccountDialog().select(null)
    expect(useAccountDialog().tab.value).toBeNull()
  })

  it('closes', () => {
    useAccountDialog().show('profile')

    useAccountDialog().close()

    expect(useAccountDialog().open.value).toBe(false)
  })
})
