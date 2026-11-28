import { mount } from '@vue/test-utils'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { toast } from 'vue-sonner'
import { authApi } from '@/api/auth'
import { ApiError } from '@/api/client'
import { installZodErrorMap } from '@/schemas/zodErrorMap'
import { useAuthStore } from '@/stores/auth'
import { createTestPlugins } from '@/test/mounting'
import { settle } from '@/test/settle'
import type { SessionResponse } from '@/types'
import LoginView from '@/views/auth/LoginView.vue'

vi.mock('@/api/auth', () => ({
  authApi: { fetchConfig: vi.fn<() => Promise<unknown>>() },
}))

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const session: SessionResponse = {
  name: 'Ana',
  email: 'ana@example.com',
  status: 'APPROVED',
  language: 'PT_BR',
  dueDateNotices: true,
  hasPassword: true,
  googleLinked: false,
  totpEnabled: false,
  totpRequired: false,
  roles: [],
}

async function render(
  options: {
    redirect?: string
    authenticated?: boolean
    loading?: boolean
    restored?: boolean
    reason?: string
    ending?: boolean
    googleAuthEnabled?: boolean
  } = {},
) {
  vi.mocked(authApi.fetchConfig).mockResolvedValue({
    googleAuthEnabled: options.googleAuthEnabled ?? false,
  })
  const { router, plugins } = createTestPlugins({
    initialState: {
      auth: {
        session: options.authenticated ? session : null,
        loading: options.loading ?? false,
        endingSession: options.ending ?? false,
      },
    },
    routes: [
      { path: '/start', name: 'start', component: { render: () => h('div') } },
      { path: '/private-page', component: { render: () => h('div') } },
      {
        path: '/auth/forgot-password',
        name: 'forgot-password',
        component: { render: () => h('div') },
      },
    ],
  })
  const auth = useAuthStore()
  vi.mocked(auth.login).mockResolvedValue({ kind: 'authenticated', session })
  vi.mocked(auth.restoreSession).mockImplementation(() => {
    auth.session = options.restored ? session : null
    return Promise.resolve(options.restored ?? false)
  })
  const query = new URLSearchParams()
  if (options.redirect) {
    query.set('redirect', options.redirect)
  }
  if (options.reason) {
    query.set('reason', options.reason)
  }
  await router.push(`/?${query}`)
  await router.isReady()
  const wrapper = mount(LoginView, { global: { plugins } })
  await settle()
  return { wrapper, router, auth }
}

async function submit(
  wrapper: Awaited<ReturnType<typeof render>>['wrapper'],
  email: string,
  password: string,
) {
  await wrapper.find('input[type="email"]').setValue(email)
  await wrapper.find('input[autocomplete="current-password"]').setValue(password)
  await wrapper.find('form').trigger('submit')
  await settle()
}

describe('LoginView', () => {
  beforeAll(() => {
    installZodErrorMap()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the credentials form and the recovery link', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Entrar')
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.find('input[autocomplete="current-password"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/auth/forgot-password"]').text()).toBe('Esqueci a senha')
    expect(wrapper.find('[data-slot="login-failure"]').exists()).toBe(false)
  })

  it('offers the Google login only when the server turns it on', async () => {
    const withoutGoogle = await render()
    const withGoogle = await render({ googleAuthEnabled: true })

    expect(
      withoutGoogle.wrapper.find('a[href="/private/oauth2/authorization/google"]').exists(),
    ).toBe(false)
    expect(withGoogle.wrapper.find('a[href="/private/oauth2/authorization/google"]').text()).toBe(
      'Entrar com Google',
    )
  })

  it('validates the fields before logging in', async () => {
    const { wrapper, auth } = await render()

    await wrapper.find('form').trigger('submit')
    await settle()

    expect(wrapper.text()).toContain('Campo obrigatório')
    expect(auth.login).not.toHaveBeenCalled()
  })

  it('rejects a malformed email', async () => {
    const { wrapper, auth } = await render()

    await submit(wrapper, 'nope', 'secret')

    expect(wrapper.text()).toContain('Informe um e-mail válido')
    expect(auth.login).not.toHaveBeenCalled()
  })

  it('logs in and goes to the home', async () => {
    const { wrapper, router, auth } = await render()

    await submit(wrapper, 'ana@example.com', 'secret')

    expect(auth.login).toHaveBeenCalledWith({ email: 'ana@example.com', password: 'secret' })
    expect(router.currentRoute.value.name).toBe('start')
  })

  it('goes back to the page that asked for the login', async () => {
    const { wrapper, router } = await render({ redirect: '/private-page' })

    await submit(wrapper, 'ana@example.com', 'secret')

    expect(router.currentRoute.value.path).toBe('/private-page')
  })

  it('ignores a redirect that leaves the application', async () => {
    const { wrapper, router } = await render({ redirect: '//evil.example' })

    await submit(wrapper, 'ana@example.com', 'secret')

    expect(router.currentRoute.value.name).toBe('start')
  })

  it('tells the user when the credentials are wrong, in an alert and not a toast', async () => {
    const { wrapper, router, auth } = await render()
    vi.mocked(auth.login).mockRejectedValue(new ApiError(null, 401))

    await submit(wrapper, 'ana@example.com', 'wrong')

    const alert = wrapper.find('[data-slot="login-failure"]')
    expect(alert.text()).toContain('E-mail ou senha incorretos')
    expect(alert.text()).toContain('Confira os dados e tente de novo.')
    expect(toast.error).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('shows the same message when the account is refused', async () => {
    const { wrapper, auth } = await render()
    vi.mocked(auth.login).mockRejectedValue(new ApiError(null, 403))

    await submit(wrapper, 'ana@example.com', 'secret')

    expect(wrapper.find('[data-slot="login-failure"]').text()).toContain(
      'E-mail ou senha incorretos',
    )
  })

  it('tells the user when there were too many attempts', async () => {
    const { wrapper, auth } = await render()
    vi.mocked(auth.login).mockRejectedValue(new ApiError(null, 429))

    await submit(wrapper, 'ana@example.com', 'secret')

    const alert = wrapper.find('[data-slot="login-failure"]')
    expect(alert.text()).toContain('Muitas tentativas seguidas')
    expect(alert.text()).not.toContain('E-mail ou senha incorretos')
  })

  it('clears the alert when the next attempt works', async () => {
    const { wrapper, auth } = await render()
    vi.mocked(auth.login).mockRejectedValueOnce(new ApiError(null, 401))

    await submit(wrapper, 'ana@example.com', 'wrong')
    await submit(wrapper, 'ana@example.com', 'secret')

    expect(wrapper.find('[data-slot="login-failure"]').exists()).toBe(false)
  })

  it('stays quiet about failures the API handler already reported', async () => {
    const { wrapper, router, auth } = await render()
    vi.mocked(auth.login).mockRejectedValue(new ApiError(null, 500))

    await submit(wrapper, 'ana@example.com', 'secret')

    expect(toast.error).not.toHaveBeenCalled()
    expect(wrapper.find('[data-slot="login-failure"]').exists()).toBe(false)
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('stays quiet about errors that are not API errors', async () => {
    const { wrapper, auth } = await render()
    vi.mocked(auth.login).mockRejectedValue(new Error('boom'))

    await submit(wrapper, 'ana@example.com', 'secret')

    expect(toast.error).not.toHaveBeenCalled()
    expect(wrapper.find('[data-slot="login-failure"]').exists()).toBe(false)
  })

  it('skips the form when the session is still valid', async () => {
    const { router, auth } = await render({ authenticated: true })

    expect(auth.restoreSession).not.toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('start')
  })

  it('skips the form when the session can be restored', async () => {
    const { router, auth } = await render({ restored: true })

    expect(auth.restoreSession).toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('start')
  })

  it('shows the form when there is no session to restore', async () => {
    const { router, auth } = await render()

    expect(auth.restoreSession).toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it.each([
    ['inactivity', 'Sua sessão foi encerrada por inatividade, entre novamente'],
    ['expired', 'Sua sessão expirou, entre novamente'],
  ])('warns that the session ended by %s', async (reason, message) => {
    await render({ reason })

    expect(toast.warning).toHaveBeenCalledWith(
      'Sessão encerrada',
      expect.objectContaining({ description: message }),
    )
  })

  it('does not warn without a reason or with one it does not know', async () => {
    await render()
    await render({ reason: 'something-else' })

    expect(toast.warning).not.toHaveBeenCalled()
  })

  it('goes back to the page the expired session came from after the next login', async () => {
    const { wrapper, router } = await render({ reason: 'expired', redirect: '/private-page' })

    await submit(wrapper, 'ana@example.com', 'secret')

    expect(router.currentRoute.value.path).toBe('/private-page')
  })

  it('does not send the user back into the app while the session is still ending', async () => {
    const { router, auth } = await render({
      authenticated: true,
      ending: true,
      reason: 'inactivity',
    })

    expect(auth.restoreSession).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/')
    expect(toast.warning).toHaveBeenCalledTimes(1)
  })

  it('disables the form and says so while the login runs', async () => {
    const { wrapper, auth } = await render()
    vi.mocked(auth.login).mockReturnValue(new Promise(() => undefined))

    await submit(wrapper, 'ana@example.com', 'secret')

    const button = wrapper.find('button[type="submit"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('Entrando…')
    expect(wrapper.find('fieldset').attributes('disabled')).toBeDefined()
  })

  it('does not say it is signing in while the session is only being restored', async () => {
    const { wrapper } = await render({ loading: true })

    expect(wrapper.find('button[type="submit"]').text()).toBe('Entrar')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })
})
