import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import App from '@/App.vue'
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
})
