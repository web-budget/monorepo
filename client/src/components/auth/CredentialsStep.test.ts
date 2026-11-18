import { mount } from '@vue/test-utils'
import { beforeAll, describe, expect, it } from 'vitest'
import CredentialsStep from '@/components/auth/CredentialsStep.vue'
import { installZodErrorMap } from '@/schemas/zodErrorMap'
import { createTestPlugins } from '@/test/mounting'
import { settle } from '@/test/settle'

const GOOGLE_LINK = 'a[href="/private/oauth2/authorization/google"]'

async function render(props: Record<string, unknown> = {}) {
  const { router, plugins } = createTestPlugins({
    routes: [
      { path: '/auth/forgot-password', name: 'forgot-password', component: { render: () => null } },
    ],
  })
  await router.push('/')
  await router.isReady()
  return mount(CredentialsStep, {
    props: { loading: false, failure: null, ...props },
    global: { plugins },
  })
}

describe('CredentialsStep', () => {
  beforeAll(() => {
    installZodErrorMap()
  })

  it('emits the credentials once they are valid', async () => {
    const wrapper = await render()

    await wrapper.find('input[type="email"]').setValue('ana@example.com')
    await wrapper.find('input[autocomplete="current-password"]').setValue('secret')
    await wrapper.find('form').trigger('submit')
    await settle()

    expect(wrapper.emitted('submit')).toEqual([[{ email: 'ana@example.com', password: 'secret' }]])
  })

  it('does not emit invalid credentials', async () => {
    const wrapper = await render()

    await wrapper.find('form').trigger('submit')
    await settle()

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.text()).toContain('Campo obrigatório')
  })

  it('hides the Google button and the divider unless Google is enabled', async () => {
    const wrapper = await render()

    expect(wrapper.find(GOOGLE_LINK).exists()).toBe(false)
    expect(wrapper.text()).not.toMatch(/\bou\b/)
  })

  it('shows the divider and the Google button when Google is enabled', async () => {
    const wrapper = await render({ googleEnabled: true })

    expect(wrapper.text()).toMatch(/\bou\b/)
    expect(wrapper.find(GOOGLE_LINK).text()).toBe('Entrar com Google')
  })

  it('hides the sign-up link until registration is enabled', async () => {
    const wrapper = await render()

    expect(wrapper.text()).not.toContain('Criar conta')
  })

  it('emits register from the sign-up link when registration is enabled', async () => {
    const wrapper = await render({ registrationEnabled: true })

    const link = wrapper.findAll('button').find((button) => button.text() === 'Criar conta')
    await link?.trigger('click')

    expect(wrapper.emitted('register')).toHaveLength(1)
  })

  it.each([
    ['credentials', 'E-mail ou senha incorretos'],
    ['rate-limit', 'Muitas tentativas seguidas'],
  ])('shows the %s failure in an alert', async (failure, title) => {
    const wrapper = await render({ failure })

    expect(wrapper.find('[role="alert"]').text()).toContain(title)
  })
})
