import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import PageStructure from '@/components/PageStructure.vue'
import { createTestPlugins } from '@/test/mounting'

async function render(props: Record<string, unknown> = {}) {
  const { router, plugins } = createTestPlugins({
    initialState: { auth: { session: { name: 'Ana', email: 'ana@example.com' } } },
  })
  await router.push('/')
  await router.isReady()
  return mount(PageStructure, {
    props,
    slots: { 'side-menu': () => h('p', 'side menu content') },
    global: { plugins },
  })
}

describe('PageStructure', () => {
  it('renders the top bar, the routed page and the footer', async () => {
    const wrapper = await render()

    expect(wrapper.find('header').exists()).toBe(true)
    expect(wrapper.find('main').text()).toContain('root')
    expect(wrapper.find('footer').exists()).toBe(true)
  })

  it('renders the side menu slot inside the sidebar', async () => {
    const wrapper = await render()

    expect(wrapper.find('[data-slot="sidebar"]').text()).toContain('side menu content')
  })

  it('omits the sidebar when the side menu is disabled', async () => {
    const wrapper = await render({ enableSideMenu: false })

    expect(wrapper.find('[data-slot="sidebar"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('side menu content')
    expect(wrapper.find('main').text()).toContain('root')
  })
})
