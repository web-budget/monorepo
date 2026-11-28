import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mailSettingsApi } from '@/api/mailSettings'
import { useMailSettingsStore } from '@/stores/mailSettings'
import type { MailSettingsForm, MailSettingsView } from '@/types'

vi.mock('@/api/mailSettings')

const view: MailSettingsView = {
  enabled: false,
  configured: true,
  host: 'smtp.example.com',
  port: 587,
  security: 'STARTTLS',
  username: null,
  passwordSet: false,
  passwordStorageAvailable: true,
  fromAddress: 'alerts@example.com',
  fromName: null,
  replyToAddress: null,
  lastUpdate: '2026-11-27T14:32:00',
}

const form: MailSettingsForm = {
  host: 'smtp.example.com',
  port: 587,
  security: 'STARTTLS',
  username: null,
  password: null,
  fromAddress: 'alerts@example.com',
  fromName: null,
  replyToAddress: null,
}

describe('useMailSettingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('loads the mail settings and returns them', async () => {
    vi.mocked(mailSettingsApi.find).mockResolvedValue(view)
    const store = useMailSettingsStore()

    await expect(store.find()).resolves.toEqual(view)

    expect(store.settings).toEqual(view)
    expect(store.loading).toBe(false)
  })

  it('keeps what the server answers after saving', async () => {
    vi.mocked(mailSettingsApi.update).mockResolvedValue({ ...view, port: 465 })
    const store = useMailSettingsStore()

    await store.update({ ...form, port: 465 })

    expect(mailSettingsApi.update).toHaveBeenCalledWith({ ...form, port: 465 })
    expect(store.settings?.port).toBe(465)
  })

  it('keeps what the server answers after turning the sending on', async () => {
    vi.mocked(mailSettingsApi.updateEnabled).mockResolvedValue({ ...view, enabled: true })
    const store = useMailSettingsStore()

    await store.updateEnabled(true)

    expect(mailSettingsApi.updateEnabled).toHaveBeenCalledWith(true)
    expect(store.settings?.enabled).toBe(true)
  })

  it('stops loading and keeps the old settings when the call fails', async () => {
    vi.mocked(mailSettingsApi.find).mockResolvedValueOnce(view)
    vi.mocked(mailSettingsApi.updateEnabled).mockRejectedValue(new Error('down'))
    const store = useMailSettingsStore()
    await store.find()

    await expect(store.updateEnabled(true)).rejects.toThrow('down')

    expect(store.loading).toBe(false)
    expect(store.settings?.enabled).toBe(false)
  })

  it('reset() forgets the settings', async () => {
    vi.mocked(mailSettingsApi.find).mockResolvedValue(view)
    const store = useMailSettingsStore()
    await store.find()

    store.reset()

    expect(store.settings).toBeNull()
    expect(store.loading).toBe(false)
  })
})
