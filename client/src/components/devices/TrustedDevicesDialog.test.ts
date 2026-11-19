import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { authApi } from '@/api/auth'
import TrustedDevicesDialog from '@/components/devices/TrustedDevicesDialog.vue'
import { useTrustedDevicesDialog } from '@/composables/useTrustedDevicesDialog'
import { createTestPlugins } from '@/test/mounting'
import { settle } from '@/test/settle'
import type { TrustedDeviceView } from '@/types'
import { ApiError } from '@/api/client'

vi.mock('@/api/auth')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

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

const dialog = useTrustedDevicesDialog()

async function open(list: TrustedDeviceView[] = devices) {
  vi.mocked(authApi.findTrustedDevices).mockResolvedValue(list)
  const { plugins } = createTestPlugins({ stubActions: false })
  const wrapper = mount(TrustedDevicesDialog, { attachTo: document.body, global: { plugins } })
  dialog.show()
  await settle()
  return wrapper
}

function button(label: string) {
  return [...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(
    (candidate) => candidate.textContent?.trim() === label,
  )
}

function dialogText() {
  return document.body.querySelector('[role="dialog"]')?.textContent ?? ''
}

describe('TrustedDevicesDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  afterEach(() => {
    dialog.close()
  })

  it('stays closed until the user menu asks for it', async () => {
    const { plugins } = createTestPlugins({ stubActions: false })
    mount(TrustedDevicesDialog, { attachTo: document.body, global: { plugins } })
    await settle()

    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    expect(authApi.findTrustedDevices).not.toHaveBeenCalled()
  })

  it('lists the devices with the label and the dates, an icon by the kind of device', async () => {
    await open()

    expect(dialogText()).toContain('Chrome · Windows')
    expect(dialogText()).toContain('Último uso em 18/11/2026 · confiado em 02/11/2026')
    expect(dialogText()).toContain('Safari · iPhone')
    expect(document.body.querySelector('svg.lucide-laptop')).not.toBeNull()
    expect(document.body.querySelector('svg.lucide-smartphone')).not.toBeNull()
    expect(dialogText()).toContain('Revogue os que você não reconhece')
  })

  it('shows placeholders while the list loads', async () => {
    vi.mocked(authApi.findTrustedDevices).mockReturnValue(new Promise(() => undefined))
    const { plugins } = createTestPlugins({ stubActions: false })
    mount(TrustedDevicesDialog, { attachTo: document.body, global: { plugins } })

    dialog.show()
    await settle()

    expect(document.body.querySelector('[data-slot="devices-loading"]')).not.toBeNull()
  })

  it('explains how to trust a device when there is none', async () => {
    await open([])

    expect(document.body.querySelector('[data-slot="devices-empty"]')?.textContent).toContain(
      'Nenhum dispositivo confiável',
    )
    expect(button('Revogar todos')).toBeUndefined()
  })

  it('shows the server error when the list cannot be loaded', async () => {
    vi.mocked(authApi.findTrustedDevices).mockRejectedValue(new ApiError(null, 500))
    const { plugins } = createTestPlugins({ stubActions: false })
    mount(TrustedDevicesDialog, { attachTo: document.body, global: { plugins } })

    dialog.show()
    await settle()

    expect(dialogText()).toContain('Nenhum dispositivo confiável')
    expect(dialogText()).toContain('Tente novamente mais tarde')
  })

  it('closes with the close button', async () => {
    await open()

    button('Fechar')!.click()
    await settle()

    expect(dialog.open.value).toBe(false)
  })

  it('closes when the dialog asks to be dismissed', async () => {
    await open()

    document.body
      .querySelector('[role="dialog"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await settle()

    expect(dialog.open.value).toBe(false)
  })

  it('asks before revoking one device, naming it, and revokes only that one', async () => {
    await open()
    vi.mocked(authApi.revokeTrustedDevice).mockResolvedValue()

    button('Revogar')!.click()
    await settle()
    expect(dialogText()).toContain('Revogar “Chrome · Windows”?')
    expect(authApi.revokeTrustedDevice).not.toHaveBeenCalled()

    document.body.querySelector<HTMLButtonElement>('[data-slot="confirm-revoke"]')!.click()
    await settle()

    expect(authApi.revokeTrustedDevice).toHaveBeenCalledWith('d-1')
    expect(toast.success).toHaveBeenCalledWith('Dispositivo revogado', expect.anything())
    expect(dialogText()).toContain('Safari · iPhone')
    expect(dialogText()).not.toContain('Chrome · Windows')
  })

  it('goes back to the list when the revocation is cancelled', async () => {
    await open()

    button('Revogar')!.click()
    await settle()
    button('Cancelar')!.click()
    await settle()

    expect(authApi.revokeTrustedDevice).not.toHaveBeenCalled()
    expect(dialogText()).toContain('Chrome · Windows')
  })

  it('asks before revoking every device', async () => {
    await open()
    vi.mocked(authApi.revokeAllTrustedDevices).mockResolvedValue()

    button('Revogar todos')!.click()
    await settle()
    expect(dialogText()).toContain('Revogar todos os dispositivos?')

    document.body.querySelector<HTMLButtonElement>('[data-slot="confirm-revoke"]')!.click()
    await settle()

    expect(authApi.revokeAllTrustedDevices).toHaveBeenCalledOnce()
    expect(toast.success).toHaveBeenCalledWith('Dispositivos revogados', expect.anything())
    expect(document.body.querySelector('[data-slot="devices-empty"]')).not.toBeNull()
  })

  it('keeps the list and says so when the server refuses to revoke', async () => {
    await open()
    vi.mocked(authApi.revokeTrustedDevice).mockRejectedValue(new ApiError(null, 500))

    button('Revogar')!.click()
    await settle()
    document.body.querySelector<HTMLButtonElement>('[data-slot="confirm-revoke"]')!.click()
    await settle()
    await flushPromises()

    expect(toast.success).not.toHaveBeenCalled()
    expect(dialogText()).toContain('Chrome · Windows')
  })

  it('starts from the list again every time it opens', async () => {
    await open()
    button('Revogar')!.click()
    await settle()

    dialog.close()
    await settle()
    dialog.show()
    await settle()

    expect(dialogText()).not.toContain('Revogar “')
  })
})
