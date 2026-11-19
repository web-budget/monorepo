import { describe, expect, it } from 'vitest'
import { useTrustedDevicesDialog } from '@/composables/useTrustedDevicesDialog'

describe('useTrustedDevicesDialog', () => {
  it('opens and closes the dialog every screen shares', () => {
    const first = useTrustedDevicesDialog()
    const second = useTrustedDevicesDialog()
    expect(first.open.value).toBe(false)

    first.show()
    expect(second.open.value).toBe(true)

    second.close()
    expect(first.open.value).toBe(false)
  })
})
