import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { useUsersAdminStore } from '@/stores/usersAdmin'
import { createTestPlugins } from '@/test/mounting'
import ConfigurationHomeView from '@/views/configuration/ConfigurationHomeView.vue'

describe('ConfigurationHomeView', () => {
  it('shows the users shortcut with the unfiltered count and the integrations as coming soon', async () => {
    const { plugins } = createTestPlugins()
    const users = useUsersAdminStore()
    vi.mocked(users.count).mockResolvedValue(6)

    const wrapper = mount(ConfigurationHomeView, { global: { plugins } })
    await flushPromises()

    expect(wrapper.find('[data-slot="page-title"]').text()).toBe('Configurações')
    const link = wrapper.find('a[data-slot="module-card"]')
    expect(link.attributes('href')).toBe('/configuration/users')
    expect(link.find('[data-slot="module-card-count"]').text()).toBe('6')
    expect(users.count).toHaveBeenCalledWith('ALL')
    const disabled = wrapper.find('[aria-disabled="true"]')
    expect(disabled.text()).toContain('Integrações')
    expect(disabled.text()).toContain('Em breve')
  })

  it('shows the users card without a count when the call fails', async () => {
    const { plugins } = createTestPlugins()
    vi.mocked(useUsersAdminStore().count).mockResolvedValue(null)

    const wrapper = mount(ConfigurationHomeView, { global: { plugins } })
    await flushPromises()

    expect(wrapper.find('[data-slot="module-card-count"]').exists()).toBe(false)
  })
})
