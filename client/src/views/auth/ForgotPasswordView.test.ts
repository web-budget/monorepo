import { mount } from '@vue/test-utils'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/client'
import { installZodErrorMap } from '@/schemas/zodErrorMap'
import { useAccountStore } from '@/stores/account'
import { createTestPlugins } from '@/test/mounting'
import { settle } from '@/test/settle'
import ForgotPasswordView from '@/views/auth/ForgotPasswordView.vue'

async function render(loading = false) {
  const { router, plugins } = createTestPlugins({
    initialState: { account: { loading } },
    routes: [{ path: '/login', name: 'login', component: { render: () => null } }],
  })
  const account = useAccountStore()
  vi.mocked(account.forgotPassword).mockResolvedValue(undefined)
  await router.push('/')
  await router.isReady()
  const wrapper = mount(ForgotPasswordView, { global: { plugins } })
  return { wrapper, account }
}

async function submit(wrapper: Awaited<ReturnType<typeof render>>['wrapper'], email: string) {
  await wrapper.find('input[type="email"]').setValue(email)
  await wrapper.find('form').trigger('submit')
  await settle()
  await settle()
}

describe('ForgotPasswordView', () => {
  beforeAll(() => {
    installZodErrorMap()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the email field and a way back to the login', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Esqueci a senha')
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/login"]').text()).toBe('Voltar para o login')
  })

  it('validates the email before sending', async () => {
    const { wrapper, account } = await render()

    await submit(wrapper, 'nope')

    expect(wrapper.text()).toContain('Informe um email válido')
    expect(account.forgotPassword).not.toHaveBeenCalled()
  })

  it('requests the recovery and tells the user to check the inbox', async () => {
    const { wrapper, account } = await render()

    await submit(wrapper, 'ana@example.com')

    expect(account.forgotPassword).toHaveBeenCalledWith({ email: 'ana@example.com' })
    expect(wrapper.find('h1').text()).toBe('Confira seu e-mail')
    expect(wrapper.text()).toContain('ana@example.com')
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.find('a[href="/login"]').text()).toBe('Voltar para o login')
  })

  it('keeps the form when the request fails', async () => {
    const { wrapper, account } = await render()
    vi.mocked(account.forgotPassword).mockRejectedValue(new ApiError(null, 404))

    await submit(wrapper, 'ana@example.com')

    expect(wrapper.find('h1').text()).toBe('Esqueci a senha')
    expect((wrapper.find('input[type="email"]').element as HTMLInputElement).value).toBe(
      'ana@example.com',
    )
  })

  it('disables the button while the request runs', async () => {
    const { wrapper } = await render(true)

    const button = wrapper.find('button[type="submit"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('Enviando…')
  })
})
