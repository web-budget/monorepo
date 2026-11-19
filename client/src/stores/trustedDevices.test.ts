import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authApi } from '@/api/auth'
import { useTrustedDevicesStore } from '@/stores/trustedDevices'
import type { TrustedDeviceView } from '@/types'

vi.mock('@/api/auth')

const devices: TrustedDeviceView[] = [
  {
    id: 'd-1',
    label: 'Chrome · Windows',
    createdOn: '2026-11-02T09:00:00',
    lastUsedOn: '2026-11-18T09:12:00',
    expiresOn: '2026-12-02T09:00:00',
  },
  {
    id: 'd-2',
    label: 'Safari · iPhone',
    createdOn: '2026-10-20T10:00:00',
    lastUsedOn: '2026-11-14T10:00:00',
    expiresOn: '2026-11-19T10:00:00',
  },
]

describe('useTrustedDevicesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('lists the devices of the logged user', async () => {
    vi.mocked(authApi.findTrustedDevices).mockResolvedValue(devices)
    const store = useTrustedDevicesStore()

    await store.findAll()

    expect(store.devices).toEqual(devices)
    expect(store.loading).toBe(false)
  })

  it('reports loading while the list is on its way, and also when it fails', async () => {
    let finish: (value: TrustedDeviceView[]) => void = () => undefined
    vi.mocked(authApi.findTrustedDevices).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const store = useTrustedDevicesStore()

    const pending = store.findAll()
    expect(store.loading).toBe(true)
    finish(devices)
    await pending
    expect(store.loading).toBe(false)

    vi.mocked(authApi.findTrustedDevices).mockRejectedValueOnce(new Error('boom'))
    await expect(store.findAll()).rejects.toThrow('boom')
    expect(store.loading).toBe(false)
  })

  it('revokes one device on the server and drops it from the list', async () => {
    vi.mocked(authApi.findTrustedDevices).mockResolvedValue(devices)
    vi.mocked(authApi.revokeTrustedDevice).mockResolvedValue()
    const store = useTrustedDevicesStore()
    await store.findAll()

    await store.revoke('d-1')

    expect(authApi.revokeTrustedDevice).toHaveBeenCalledWith('d-1')
    expect(store.devices.map((device) => device.id)).toEqual(['d-2'])
  })

  it('keeps the list when the server refuses to revoke', async () => {
    vi.mocked(authApi.findTrustedDevices).mockResolvedValue(devices)
    vi.mocked(authApi.revokeTrustedDevice).mockRejectedValue(new Error('boom'))
    const store = useTrustedDevicesStore()
    await store.findAll()

    await expect(store.revoke('d-1')).rejects.toThrow('boom')

    expect(store.devices).toHaveLength(2)
  })

  it('revokes every device', async () => {
    vi.mocked(authApi.findTrustedDevices).mockResolvedValue(devices)
    vi.mocked(authApi.revokeAllTrustedDevices).mockResolvedValue()
    const store = useTrustedDevicesStore()
    await store.findAll()

    await store.revokeAll()

    expect(authApi.revokeAllTrustedDevices).toHaveBeenCalledOnce()
    expect(store.devices).toEqual([])
  })

  it('reset() forgets the devices of the previous user', async () => {
    vi.mocked(authApi.findTrustedDevices).mockResolvedValue(devices)
    const store = useTrustedDevicesStore()
    await store.findAll()

    store.reset()

    expect(store.devices).toEqual([])
    expect(store.loading).toBe(false)
  })
})
