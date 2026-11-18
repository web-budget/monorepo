import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/client'
import { useAccountStore } from '@/stores/account'
import { createTestPlugins } from '@/test/mounting'
import AccountActivationView from '@/views/auth/AccountActivationView.vue'

async function render(activate: () => Promise<void>, query = '?token=abc&email=ana%40example.com') {
  const { router, plugins } = createTestPlugins({
    routes: [{ path: '/login', name: 'login', component: { render: () => null } }],
  })
  const account = useAccountStore()
  vi.mocked(account.activate).mockImplementation(activate)
  await router.push(`/${query}`)
  await router.isReady()
  const wrapper = mount(AccountActivationView, { global: { plugins } })
  return { wrapper, account }
}

describe('AccountActivationView', () => {
  it('shows progress while the account is being activated', async () => {
    const { wrapper } = await render(() => new Promise(() => undefined))

    expect(wrapper.find('[role="status"]').text()).toBe('Ativando conta, aguarde...')
  })

  it('activates the account with the token and email from the link', async () => {
    const { wrapper, account } = await render(() => Promise.resolve())
    await flushPromises()

    expect(account.activate).toHaveBeenCalledWith({ token: 'abc', email: 'ana@example.com' })
    expect(wrapper.find('[role="status"]').text()).toBe('Conta ativada com sucesso!')
    expect(wrapper.find('[role="status"]').classes()).not.toContain('text-destructive')
  })

  it('explains the failure when the token is not accepted', async () => {
    const { wrapper } = await render(() => Promise.reject(new ApiError(null, 400)))
    await flushPromises()

    expect(wrapper.find('[role="status"]').text()).toBe(
      'Token inválido ou expirado, entre em contato com o administrador',
    )
    expect(wrapper.find('[role="status"]').classes()).toContain('text-destructive')
  })

  it('still tries to activate when the link carries no parameters', async () => {
    const { account } = await render(() => Promise.resolve(), '')
    await flushPromises()

    expect(account.activate).toHaveBeenCalledWith({ token: '', email: '' })
  })

  it('links back to the login', async () => {
    const { wrapper } = await render(() => Promise.resolve())

    expect(wrapper.find('a[href="/login"]').text()).toBe('Voltar ao login')
  })
})
