import { mount } from '@vue/test-utils'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { ApiError } from '@/api/client'
import { installZodErrorMap } from '@/schemas/zodErrorMap'
import { useAccountStore } from '@/stores/account'
import { createTestPlugins } from '@/test/mounting'
import { settle } from '@/test/settle'
import RecoverPasswordView from '@/views/auth/RecoverPasswordView.vue'

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

async function render(options: { query?: string; loading?: boolean } = {}) {
  const { router, plugins } = createTestPlugins({
    initialState: { account: { loading: options.loading ?? false } },
    routes: [{ path: '/login', name: 'login', component: { render: () => null } }],
  })
  const account = useAccountStore()
  vi.mocked(account.recoverPassword).mockResolvedValue(undefined)
  await router.push(`/${options.query ?? '?token=abc&email=ana%40example.com'}`)
  await router.isReady()
  const wrapper = mount(RecoverPasswordView, { global: { plugins } })
  return { wrapper, router, account }
}

async function submit(
  wrapper: Awaited<ReturnType<typeof render>>['wrapper'],
  password: string,
  confirmation: string,
) {
  const fields = wrapper.findAll('input[autocomplete="new-password"]')
  await fields[0]?.setValue(password)
  await fields[1]?.setValue(confirmation)
  await wrapper.find('form').trigger('submit')
  await settle()
}

describe('RecoverPasswordView', () => {
  beforeAll(() => {
    installZodErrorMap()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the password and its confirmation', async () => {
    const { wrapper } = await render()

    expect(wrapper.text()).toContain('Recuperar senha')
    expect(wrapper.findAll('input[autocomplete="new-password"]')).toHaveLength(2)
  })

  it('requires the password and its confirmation', async () => {
    const { wrapper, account } = await render()

    await submit(wrapper, '', '')

    expect(wrapper.text()).toContain('Informe ao menos 3 caracteres')
    expect(wrapper.text()).toContain('Campo obrigatório')
    expect(account.recoverPassword).not.toHaveBeenCalled()
  })

  it('rejects a confirmation that differs from the password', async () => {
    const { wrapper, account } = await render()

    await submit(wrapper, 'secret', 'other')

    expect(wrapper.text()).toContain('A confirmação deve ser igual à senha')
    expect(account.recoverPassword).not.toHaveBeenCalled()
  })

  it('sends the token and email from the link with the new password', async () => {
    const { wrapper, router, account } = await render()

    await submit(wrapper, 'secret', 'secret')

    expect(account.recoverPassword).toHaveBeenCalledWith({
      token: 'abc',
      email: 'ana@example.com',
      password: 'secret',
    })
    expect(toast.success).toHaveBeenCalledWith('Sucesso!', {
      description: 'Senha recuperada, realize login para continuar',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('sends empty values when the link carries no token', async () => {
    const { wrapper, account } = await render({ query: '' })

    await submit(wrapper, 'secret', 'secret')

    expect(account.recoverPassword).toHaveBeenCalledWith({
      token: '',
      email: '',
      password: 'secret',
    })
  })

  it('stays on the page when the recovery fails', async () => {
    const { wrapper, router, account } = await render()
    vi.mocked(account.recoverPassword).mockRejectedValue(new ApiError(null, 400))

    await submit(wrapper, 'secret', 'secret')

    expect(toast.success).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('disables the button while the request runs', async () => {
    const { wrapper } = await render({ loading: true })

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })
})
