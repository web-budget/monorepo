import { mount } from '@vue/test-utils'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { toast } from 'vue-sonner'
import { ApiError } from '@/api/client'
import { installZodErrorMap } from '@/schemas/zodErrorMap'
import { useAuthStore } from '@/stores/auth'
import { createTestPlugins } from '@/test/mounting'
import { settle } from '@/test/settle'
import type { SessionResponse } from '@/types'
import LoginView from '@/views/auth/LoginView.vue'

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
  roles: [],
}

async function render(
  options: {
    redirect?: string
    authenticated?: boolean
    loading?: boolean
    restored?: boolean
  } = {},
) {
  const { router, plugins } = createTestPlugins({
    initialState: {
      auth: { session: options.authenticated ? session : null, loading: options.loading ?? false },
    },
    routes: [
      { path: '/home', name: 'home', component: { render: () => h('div') } },
      { path: '/private-page', component: { render: () => h('div') } },
      {
        path: '/auth/forgot-password',
        name: 'forgot-password',
        component: { render: () => h('div') },
      },
    ],
  })
  const auth = useAuthStore()
  vi.mocked(auth.login).mockResolvedValue(session)
  vi.mocked(auth.restoreSession).mockResolvedValue(options.restored ?? false)
  await router.push(options.redirect ? `/?redirect=${encodeURIComponent(options.redirect)}` : '/')
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

    expect(wrapper.text()).toContain('Faça login para continuar')
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.find('input[autocomplete="current-password"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/auth/forgot-password"]').text()).toBe('Esqueceu a senha?')
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

    expect(wrapper.text()).toContain('Informe um email válido')
    expect(auth.login).not.toHaveBeenCalled()
  })

  it('logs in and goes to the home', async () => {
    const { wrapper, router, auth } = await render()

    await submit(wrapper, 'ana@example.com', 'secret')

    expect(auth.login).toHaveBeenCalledWith({ email: 'ana@example.com', password: 'secret' })
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('goes back to the page that asked for the login', async () => {
    const { wrapper, router } = await render({ redirect: '/private-page' })

    await submit(wrapper, 'ana@example.com', 'secret')

    expect(router.currentRoute.value.path).toBe('/private-page')
  })

  it('ignores a redirect that leaves the application', async () => {
    const { wrapper, router } = await render({ redirect: '//evil.example' })

    await submit(wrapper, 'ana@example.com', 'secret')

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('tells the user when the credentials are wrong', async () => {
    const { wrapper, router, auth } = await render()
    vi.mocked(auth.login).mockRejectedValue(new ApiError(null, 401))

    await submit(wrapper, 'ana@example.com', 'wrong')

    expect(toast.error).toHaveBeenCalledWith('Falha ao realizar login', {
      description: 'Verifique os dados informados e tente novamente',
      duration: 4000,
    })
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('also tells the user when the account is refused', async () => {
    const { wrapper, auth } = await render()
    vi.mocked(auth.login).mockRejectedValue(new ApiError(null, 403))

    await submit(wrapper, 'ana@example.com', 'secret')

    expect(toast.error).toHaveBeenCalledTimes(1)
  })

  it('stays quiet about failures the API handler already reported', async () => {
    const { wrapper, router, auth } = await render()
    vi.mocked(auth.login).mockRejectedValue(new ApiError(null, 500))

    await submit(wrapper, 'ana@example.com', 'secret')

    expect(toast.error).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('stays quiet about errors that are not API errors', async () => {
    const { wrapper, auth } = await render()
    vi.mocked(auth.login).mockRejectedValue(new Error('boom'))

    await submit(wrapper, 'ana@example.com', 'secret')

    expect(toast.error).not.toHaveBeenCalled()
  })

  it('skips the form when the session is still valid', async () => {
    const { router, auth } = await render({ authenticated: true })

    expect(auth.restoreSession).not.toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('skips the form when the session can be restored', async () => {
    const { router, auth } = await render({ restored: true })

    expect(auth.restoreSession).toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('shows the form when there is no session to restore', async () => {
    const { router, auth } = await render()

    expect(auth.restoreSession).toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('disables the button while the login runs', async () => {
    const { wrapper } = await render({ loading: true })

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })
})
