import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { createTestPlugins } from '@/test/mounting'
import PendingApprovalView from '@/views/auth/PendingApprovalView.vue'

async function render(auth: Record<string, unknown> = {}) {
  const { router, plugins } = createTestPlugins({
    initialState: { auth },
    routes: [{ path: '/login', name: 'login', component: { render: () => h('div') } }],
  })
  await router.push('/')
  await router.isReady()
  const wrapper = mount(PendingApprovalView, { global: { plugins } })
  return { wrapper, router, store: useAuthStore() }
}

describe('PendingApprovalView', () => {
  it('names the e-mail that was just registered, and reminds about the activation link', async () => {
    const { wrapper } = await render({ registeredEmail: 'maria@example.com' })

    expect(wrapper.find('h1').text()).toBe('Conta aguardando aprovação')
    expect(wrapper.text()).toContain('Recebemos o cadastro de maria@example.com')
    expect(wrapper.find('[data-slot="activation-hint"]').text()).toContain('link de ativação')
  })

  it('names the e-mail of the session when the account already activated', async () => {
    const { wrapper } = await render({
      session: { name: 'Maria', email: 'session@example.com', status: 'PENDING', roles: [] },
    })

    expect(wrapper.text()).toContain('Recebemos o cadastro de session@example.com')
    expect(wrapper.find('[data-slot="activation-hint"]').exists()).toBe(false)
  })

  it('falls back to a generic text when it does not know the e-mail', async () => {
    const { wrapper } = await render()

    expect(wrapper.text()).not.toContain('Recebemos o cadastro')
    expect(wrapper.text()).toContain('Assim que um administrador aprovar a conta')
  })

  it('goes back to the login when there is no session', async () => {
    const { wrapper, router, store } = await render({ registeredEmail: 'maria@example.com' })

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('login')
    expect(store.logout).not.toHaveBeenCalled()
  })

  it('ends the session before going back, or the login would bring the person here again', async () => {
    const { wrapper, router, store } = await render({
      session: { name: 'Maria', email: 'maria@example.com', status: 'PENDING', roles: [] },
    })

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(store.logout).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.name).not.toBe('login')
  })
})
