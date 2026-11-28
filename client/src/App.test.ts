import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import App from '@/App.vue'
import * as inactivity from '@/composables/useInactivityLogout'
import { createTestPlugins } from '@/test/mounting'

describe('App', () => {
  it('renders the routed page with the notification area and the confirm dialog host', async () => {
    const { router, plugins } = createTestPlugins()
    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, { global: { plugins } })

    expect(wrapper.text()).toContain('root')
    expect(wrapper.find('section[aria-label^="Notifications"]').exists()).toBe(true)
  })

  it('covers the page with the loading state while the session is being restored', async () => {
    const { router, plugins } = createTestPlugins({
      initialState: { auth: { restoringSession: true } },
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, { global: { plugins } })

    expect(wrapper.find('[role="status"][aria-label="Carregando..."]').exists()).toBe(true)
    expect(wrapper.text()).toContain('root')
  })

  it('shows no loading state when the session is not being restored', async () => {
    const { router, plugins } = createTestPlugins()
    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, { global: { plugins } })

    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('watches the inactivity of the session while it is mounted', async () => {
    const watching = vi.spyOn(inactivity, 'useInactivityLogout')
    const { router, plugins } = createTestPlugins()
    await router.push('/')
    await router.isReady()

    mount(App, { global: { plugins } })

    expect(watching).toHaveBeenCalledOnce()
  })
})
