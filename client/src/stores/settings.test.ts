import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { settingsApi } from '@/api/settings'
import { useSettingsStore } from '@/stores/settings'

vi.mock('@/api/settings')

describe('useSettingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('loads the settings and returns them', async () => {
    vi.mocked(settingsApi.find).mockResolvedValue({ reserveMonths: 6 })
    const store = useSettingsStore()

    await expect(store.find()).resolves.toEqual({ reserveMonths: 6 })

    expect(store.settings).toEqual({ reserveMonths: 6 })
    expect(store.loading).toBe(false)
  })

  it('keeps what the server answers after saving', async () => {
    vi.mocked(settingsApi.update).mockResolvedValue({ reserveMonths: 12 })
    const store = useSettingsStore()

    await expect(store.update({ reserveMonths: 12 })).resolves.toEqual({ reserveMonths: 12 })

    expect(settingsApi.update).toHaveBeenCalledWith({ reserveMonths: 12 })
    expect(store.settings).toEqual({ reserveMonths: 12 })
  })

  it('stops loading and keeps the old settings when the call fails', async () => {
    vi.mocked(settingsApi.find).mockResolvedValueOnce({ reserveMonths: 6 })
    vi.mocked(settingsApi.update).mockRejectedValue(new Error('down'))
    const store = useSettingsStore()
    await store.find()

    await expect(store.update({ reserveMonths: 12 })).rejects.toThrow('down')

    expect(store.loading).toBe(false)
    expect(store.settings).toEqual({ reserveMonths: 6 })
  })

  it('reset() forgets the settings', async () => {
    vi.mocked(settingsApi.find).mockResolvedValue({ reserveMonths: 6 })
    const store = useSettingsStore()
    await store.find()

    store.reset()

    expect(store.settings).toBeNull()
    expect(store.loading).toBe(false)
  })
})
