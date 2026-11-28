import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/client'
import { useMailSettingsStore } from '@/stores/mailSettings'
import { useUsersAdminStore } from '@/stores/usersAdmin'
import { createTestPlugins } from '@/test/mounting'
import type { MailSettingsView } from '@/types'
import ConfigurationHomeView from '@/views/configuration/ConfigurationHomeView.vue'

const mailSettings: MailSettingsView = {
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
  lastUpdate: null,
}

async function render(mail: MailSettingsView) {
  const { plugins } = createTestPlugins()
  vi.mocked(useUsersAdminStore().count).mockResolvedValue(6)
  vi.mocked(useMailSettingsStore().find).mockResolvedValue(mail)
  const wrapper = mount(ConfigurationHomeView, { global: { plugins } })
  await flushPromises()
  return wrapper
}

function mailCard(wrapper: Awaited<ReturnType<typeof render>>) {
  return wrapper.findAll('a[data-slot="module-card"]')[2]!
}

describe('ConfigurationHomeView', () => {
  it('shows the users shortcut with the unfiltered count, the settings and the e-mail shortcuts and the integrations as coming soon', async () => {
    const wrapper = await render(mailSettings)

    expect(wrapper.find('[data-slot="page-title"]').text()).toBe('Configurações')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe(
      'Contas de usuários, parâmetros, e-mail e integrações.',
    )
    const link = wrapper.find('a[data-slot="module-card"]')
    expect(link.attributes('href')).toBe('/configuration/users')
    expect(link.find('[data-slot="module-card-count"]').text()).toBe('6')
    expect(useUsersAdminStore().count).toHaveBeenCalledWith('ALL')
    const settings = wrapper.findAll('a[data-slot="module-card"]')[1]!
    expect(settings.attributes('href')).toBe('/configuration/settings')
    expect(settings.text()).toContain('Parâmetros')
    expect(settings.find('[data-slot="module-card-count"]').exists()).toBe(false)
    expect(mailCard(wrapper).attributes('href')).toBe('/configuration/mail')
    expect(mailCard(wrapper).text()).toContain('E-mail')
    expect(mailCard(wrapper).text()).toContain('Servidor SMTP e envio dos e-mails.')
    const disabled = wrapper.find('[aria-disabled="true"]')
    expect(disabled.text()).toContain('Integrações')
    expect(disabled.text()).toContain('Em breve')
  })

  it('flags the e-mail card as having no server until one is saved, with no count', async () => {
    const wrapper = await render({ ...mailSettings, configured: false })

    expect(mailCard(wrapper).find('[data-slot="module-card-attention"]').text()).toBe(
      'Sem servidor',
    )
    expect(mailCard(wrapper).find('[data-slot="module-card-count"]').exists()).toBe(false)
  })

  it.each([
    [true, 'Ligado'],
    [false, 'Desligado'],
  ])('shows whether the sending is on when a server is saved (%s)', async (enabled, text) => {
    const wrapper = await render({ ...mailSettings, enabled })

    expect(mailCard(wrapper).find('[data-slot="module-card-count"]').text()).toBe(text)
    expect(mailCard(wrapper).find('[data-slot="module-card-attention"]').exists()).toBe(false)
  })

  it('shows the cards without a count or a badge when the calls fail', async () => {
    const { plugins } = createTestPlugins()
    vi.mocked(useUsersAdminStore().count).mockResolvedValue(null)
    vi.mocked(useMailSettingsStore().find).mockRejectedValue(new ApiError(null, 500))

    const wrapper = mount(ConfigurationHomeView, { global: { plugins } })
    await flushPromises()

    expect(wrapper.find('[data-slot="module-card-count"]').exists()).toBe(false)
    expect(wrapper.find('[data-slot="module-card-attention"]').exists()).toBe(false)
  })
})
