import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { ApiError } from '@/api/client'
import SecurityTab from '@/components/account/SecurityTab.vue'
import { useTrustedDevicesStore } from '@/stores/trustedDevices'
import { createTestPlugins } from '@/test/mounting'
import { settle } from '@/test/settle'
import type { TrustedDeviceView } from '@/types'

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

function device(index: number, label = `Chrome · Windows ${index}`): TrustedDeviceView {
  return {
    id: `d-${index}`,
    label,
    createdOn: '2026-11-02T09:00:00',
    lastUsedOn: '2026-11-18T09:12:00',
    expiresOn: '2026-12-02T09:00:00',
  }
}

interface Options {
  hasPassword?: boolean
  googleLinked?: boolean
  totpEnabled?: boolean
  totpRequired?: boolean
  devices?: TrustedDeviceView[]
}

async function render(options: Options = {}) {
  const { plugins } = createTestPlugins({
    initialState: {
      auth: {
        session: {
          email: 'maria@exemplo.com.br',
          hasPassword: options.hasPassword ?? true,
          googleLinked: options.googleLinked ?? false,
          totpEnabled: options.totpEnabled ?? true,
          totpRequired: options.totpRequired ?? true,
        },
      },
      trustedDevices: { devices: options.devices ?? [device(1), device(2), device(3)] },
    },
  })
  const wrapper = mount(SecurityTab, { attachTo: document.body, global: { plugins } })
  await settle()
  return wrapper
}

function button(wrapper: Awaited<ReturnType<typeof render>>, label: string) {
  return wrapper.findAll('button').find((candidate) => candidate.text() === label)
}

describe('SecurityTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the two-step verification as active with its help and loads the devices', async () => {
    const wrapper = await render()

    expect(wrapper.text()).toContain('Verificação em duas etapas')
    expect(wrapper.get('[data-slot="two-factor-status"]').text()).toBe('Ativa')
    expect(wrapper.text()).toContain(
      'Pedida no login com senha, pelo aplicativo autenticador. Trocou de celular? Peça a um administrador para resetar.',
    )
    expect(useTrustedDevicesStore().findAll).toHaveBeenCalledTimes(1)
  })

  it('tells that the Google login does not ask for the code in a linked account', async () => {
    const wrapper = await render({ googleLinked: true })

    expect(wrapper.text()).toContain(
      'Pedida no login com senha; o login com o Google não pede o código. Trocou de celular? Peça a um administrador para resetar.',
    )
  })

  it('shows a grey Desativada without the devices when the installation does not ask for the code', async () => {
    const wrapper = await render({ totpEnabled: false, totpRequired: false })

    expect(wrapper.get('[data-slot="two-factor-status"]').text()).toBe('Desativada')
    expect(wrapper.text()).toContain('Esta instalação não pede o código do autenticador.')
    expect(wrapper.find('[data-slot="devices"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Dispositivos confiáveis')
    expect(useTrustedDevicesStore().findAll).not.toHaveBeenCalled()
  })

  it('shows a pending badge without the devices for an account that has no authenticator yet', async () => {
    const wrapper = await render({ totpEnabled: false, totpRequired: true })

    expect(wrapper.get('[data-slot="two-factor-status"]').text()).toBe('Pendente')
    expect(wrapper.text()).toContain('O autenticador é cadastrado no próximo login com senha.')
    expect(wrapper.text()).not.toContain('Esta instalação não pede')
    expect(wrapper.find('[data-slot="devices"]').exists()).toBe(false)
    expect(useTrustedDevicesStore().findAll).not.toHaveBeenCalled()
  })

  it('shows the active badge even when the installation does not ask for the code', async () => {
    const wrapper = await render({ totpEnabled: true, totpRequired: false })

    expect(wrapper.get('[data-slot="two-factor-status"]').text()).toBe('Ativa')
    expect(wrapper.find('[data-slot="devices"]').exists()).toBe(true)
  })

  it('swaps a Google only account for the notice', async () => {
    const wrapper = await render({ hasPassword: false })

    expect(wrapper.get('[data-slot="google-notice"]').text()).toContain('Você entra com o Google')
    expect(wrapper.find('[data-slot="two-factor-status"]').exists()).toBe(false)
    expect(useTrustedDevicesStore().findAll).not.toHaveBeenCalled()
  })

  it('lists the devices with the help and the revoke all button in the header', async () => {
    const wrapper = await render()

    const section = wrapper.get('[data-slot="devices"]')
    expect(section.text()).toContain('Dispositivos confiáveis')
    expect(section.text()).toContain('O login nestes dispositivos não pede o código.')
    expect(section.text()).toContain('Último uso em 18/11/2026 · confiado em 02/11/2026')
    expect(button(wrapper, 'Revogar todos')).toBeDefined()
    expect(wrapper.findAll('li')).toHaveLength(3)
    expect(wrapper.find('[data-slot="devices-pager"]').exists()).toBe(false)
  })

  it('shows an icon by the kind of device', async () => {
    const wrapper = await render({ devices: [device(1), device(2, 'Safari · iPhone')] })

    expect(wrapper.find('svg.lucide-laptop').exists()).toBe(true)
    expect(wrapper.find('svg.lucide-smartphone').exists()).toBe(true)
  })

  it('shows placeholders while the devices load', async () => {
    const { plugins } = createTestPlugins({
      initialState: { auth: { session: { hasPassword: true, totpEnabled: true } } },
    })
    vi.mocked(useTrustedDevicesStore().findAll).mockReturnValue(new Promise(() => undefined))
    const wrapper = mount(SecurityTab, { attachTo: document.body, global: { plugins } })
    await flushPromises()

    expect(wrapper.find('[data-slot="devices-loading"]').exists()).toBe(true)
  })

  it('explains how to trust a device when there is none, without the help or revoke all', async () => {
    const wrapper = await render({ devices: [] })

    expect(wrapper.get('[data-slot="devices-empty"]').text()).toContain(
      'Nenhum dispositivo confiável',
    )
    expect(wrapper.text()).not.toContain('O login nestes dispositivos não pede o código.')
    expect(button(wrapper, 'Revogar todos')).toBeUndefined()
  })

  it('shows the server error when the list cannot be loaded', async () => {
    const { plugins } = createTestPlugins({
      initialState: { auth: { session: { hasPassword: true, totpEnabled: true } } },
    })
    vi.mocked(useTrustedDevicesStore().findAll).mockRejectedValue(new ApiError(null, 500))
    const wrapper = mount(SecurityTab, { attachTo: document.body, global: { plugins } })
    await settle()

    expect(wrapper.text()).toContain('Tente novamente mais tarde')
  })

  it('shows three devices per page with the range and the pagination of the listings', async () => {
    const wrapper = await render({ devices: Array.from({ length: 7 }, (_, i) => device(i + 1)) })

    expect(wrapper.findAll('li')).toHaveLength(3)
    const pager = wrapper.get('[data-slot="devices-pager"]')
    expect(pager.text()).toContain('1–3 de 7')
    expect(pager.find('[aria-label="Primeira página"]').exists()).toBe(true)
    expect(pager.find('[aria-label="Página anterior"]').exists()).toBe(true)
    expect(pager.find('[aria-label="Próxima página"]').exists()).toBe(true)
    expect(pager.find('[aria-label="Última página"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Chrome · Windows 1')
    expect(wrapper.text()).not.toContain('Chrome · Windows 4')
  })

  it('keeps the pagination short with an ellipsis when there are many pages', async () => {
    const wrapper = await render({ devices: Array.from({ length: 30 }, (_, i) => device(i + 1)) })

    expect(wrapper.get('[data-slot="devices-pager"]').text()).toContain('1–3 de 30')
    expect(wrapper.find('[data-slot="pagination-ellipsis"]').exists()).toBe(true)
  })

  it('moves between the pages, up to a last page with the remaining devices', async () => {
    const wrapper = await render({ devices: Array.from({ length: 7 }, (_, i) => device(i + 1)) })

    await wrapper.get('[aria-label="Próxima página"]').trigger('click')
    expect(wrapper.get('[data-slot="devices-pager"]').text()).toContain('4–6 de 7')
    expect(wrapper.text()).toContain('Chrome · Windows 4')

    await wrapper.get('[aria-label="Última página"]').trigger('click')
    expect(wrapper.get('[data-slot="devices-pager"]').text()).toContain('7–7 de 7')
    expect(wrapper.findAll('li')).toHaveLength(1)

    await wrapper.get('[aria-label="Primeira página"]').trigger('click')
    expect(wrapper.get('[data-slot="devices-pager"]').text()).toContain('1–3 de 7')
  })

  it('opens the revoke panel of one device in place of the tab, keeping the list out of it', async () => {
    const wrapper = await render()

    await wrapper.findAll('li')[1]!.get('button').trigger('click')

    const panel = wrapper.get('[data-slot="revoke-panel"]')
    expect(panel.text()).toContain('Revogar “Chrome · Windows 2”?')
    expect(panel.text()).toContain('Se for o dispositivo que você está usando')
    expect(wrapper.find('[data-slot="two-factor-status"]').exists()).toBe(false)
    expect(wrapper.find('[data-slot="devices"]').exists()).toBe(false)
  })

  it('goes back to the tab on Cancelar without revoking', async () => {
    const wrapper = await render()
    await wrapper.findAll('li')[0]!.get('button').trigger('click')

    await button(wrapper, 'Cancelar')!.trigger('click')

    expect(wrapper.find('[data-slot="revoke-panel"]').exists()).toBe(false)
    expect(wrapper.find('[data-slot="devices"]').exists()).toBe(true)
    expect(useTrustedDevicesStore().revoke).not.toHaveBeenCalled()
  })

  it('revokes one device, says so and goes back to the tab', async () => {
    const wrapper = await render()
    vi.mocked(useTrustedDevicesStore().revoke).mockResolvedValue()
    await wrapper.findAll('li')[1]!.get('button').trigger('click')

    await wrapper.get('[data-slot="confirm-revoke"]').trigger('click')
    await settle()

    expect(useTrustedDevicesStore().revoke).toHaveBeenCalledWith('d-2')
    expect(toast.success).toHaveBeenCalledWith('Dispositivo revogado', expect.anything())
    expect(wrapper.find('[data-slot="revoke-panel"]').exists()).toBe(false)
  })

  it('revokes all the devices after a confirmation that names the current one too', async () => {
    const wrapper = await render()
    vi.mocked(useTrustedDevicesStore().revokeAll).mockResolvedValue()

    await button(wrapper, 'Revogar todos')!.trigger('click')
    expect(wrapper.get('[data-slot="revoke-panel"]').text()).toContain(
      'Revogar todos os dispositivos?',
    )
    expect(wrapper.text()).toContain('inclusive neste')

    await wrapper.get('[data-slot="confirm-revoke"]').trigger('click')
    await settle()

    expect(useTrustedDevicesStore().revokeAll).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledWith('Dispositivos revogados', expect.anything())
  })

  it('does not say it revoked when the server refuses, and shows the error on the tab', async () => {
    const wrapper = await render()
    vi.mocked(useTrustedDevicesStore().revoke).mockRejectedValue(new ApiError(null, 500))
    await wrapper.findAll('li')[0]!.get('button').trigger('click')

    await wrapper.get('[data-slot="confirm-revoke"]').trigger('click')
    await settle()

    expect(toast.success).not.toHaveBeenCalled()
    expect(wrapper.find('[data-slot="revoke-panel"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Tente novamente mais tarde')
  })

  it('falls back to the last page when the revoked device was the only one on it', async () => {
    const wrapper = await render({ devices: Array.from({ length: 4 }, (_, i) => device(i + 1)) })
    const store = useTrustedDevicesStore()
    vi.mocked(store.revoke).mockImplementation(() => {
      store.devices = store.devices.filter((candidate) => candidate.id !== 'd-4')
      return Promise.resolve()
    })
    await wrapper.get('[aria-label="Próxima página"]').trigger('click')
    expect(wrapper.findAll('li')).toHaveLength(1)

    await wrapper.findAll('li')[0]!.get('button').trigger('click')
    await wrapper.get('[data-slot="confirm-revoke"]').trigger('click')
    await settle()

    expect(wrapper.findAll('li')).toHaveLength(3)
    expect(wrapper.find('[data-slot="devices-pager"]').exists()).toBe(false)
  })
})
