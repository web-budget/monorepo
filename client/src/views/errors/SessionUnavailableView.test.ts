import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { createTestPlugins } from '@/test/mounting'
import SessionUnavailableView from '@/views/errors/SessionUnavailableView.vue'

async function render(redirect?: string) {
  const { router, plugins } = createTestPlugins({
    routes: [
      { path: '/login', name: 'login', component: { render: () => h('div') } },
      { path: '/start', name: 'start', component: { render: () => h('div') } },
      { path: '/financial', component: { render: () => h('div') } },
      { path: '/error/session-unavailable', component: { render: () => h('div') } },
    ],
  })
  await router.push({ path: '/error/session-unavailable', query: redirect ? { redirect } : {} })
  await router.isReady()
  const replace = vi.spyOn(router, 'replace')
  const wrapper = mount(SessionUnavailableView, { global: { plugins } })
  return { wrapper, replace, store: useAuthStore() }
}

describe('SessionUnavailableView', () => {
  it('tells the connection failed and offers to try again, without a way to the login', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Falha na conexão')
    expect(wrapper.text()).toContain('Não foi possível se conectar ao servidor')
    expect(wrapper.find('button').text()).toBe('Tentar de novo')
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('goes back to the requested screen when the session comes back', async () => {
    const { wrapper, replace, store } = await render('/financial')
    vi.mocked(store.restoreSession).mockResolvedValue(true)

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(replace).toHaveBeenCalledWith('/financial')
  })

  it('goes to the start when the session comes back and the redirect is not an internal path', async () => {
    const { wrapper, replace, store } = await render('https://evil.example')
    vi.mocked(store.restoreSession).mockResolvedValue(true)

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(replace).toHaveBeenCalledWith({ name: 'start' })
  })

  it('goes to the login, keeping the destination, when the session turns out to be gone', async () => {
    const { wrapper, replace, store } = await render('/financial')
    vi.mocked(store.restoreSession).mockResolvedValue(false)

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(replace).toHaveBeenCalledWith({ name: 'login', query: { redirect: '/financial' } })
  })

  it('goes to the plain login when the session is gone and there was no destination', async () => {
    const { wrapper, replace, store } = await render()
    vi.mocked(store.restoreSession).mockResolvedValue(false)

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(replace).toHaveBeenCalledWith({ name: 'login', query: {} })
  })

  it('stays on the screen when the server is still unreachable', async () => {
    const { wrapper, replace, store } = await render('/financial')
    vi.mocked(store.restoreSession).mockImplementation(() => {
      store.sessionUnavailable = true
      return Promise.resolve(false)
    })

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(replace).not.toHaveBeenCalled()
    expect(wrapper.find('h1').text()).toBe('Falha na conexão')
  })
})
