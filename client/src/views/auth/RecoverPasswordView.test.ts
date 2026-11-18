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

type Wrapper = Awaited<ReturnType<typeof render>>['wrapper']

async function fill(wrapper: Wrapper, password: string, confirmation: string) {
  const fields = wrapper.findAll('input[autocomplete="new-password"]')
  await fields[0]?.setValue(password)
  await fields[1]?.setValue(confirmation)
}

async function submit(wrapper: Wrapper, password: string, confirmation: string) {
  await fill(wrapper, password, confirmation)
  await wrapper.find('form').trigger('submit')
  await settle()
}

function requirement(wrapper: Wrapper, text: string) {
  return wrapper
    .findAll('[data-slot="password-requirements"] li')
    .find((item) => item.text().includes(text))
}

describe('RecoverPasswordView', () => {
  beforeAll(() => {
    installZodErrorMap()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the password and its confirmation for the account in the link', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Criar nova senha')
    expect(wrapper.text()).toContain('ana@example.com')
    expect(wrapper.findAll('input[autocomplete="new-password"]')).toHaveLength(2)
  })

  it('updates the requirements as the password is typed', async () => {
    const { wrapper } = await render()

    expect(requirement(wrapper, 'Pelo menos 8 caracteres')?.attributes('data-met')).toBe('false')

    await fill(wrapper, 'Caderno1', '')

    expect(requirement(wrapper, 'Pelo menos 8 caracteres')?.attributes('data-met')).toBe('true')
    expect(requirement(wrapper, 'Uma letra maiúscula')?.attributes('data-met')).toBe('true')
    expect(requirement(wrapper, 'Um número')?.attributes('data-met')).toBe('true')

    await fill(wrapper, 'caderno', '')

    expect(requirement(wrapper, 'Pelo menos 8 caracteres')?.attributes('data-met')).toBe('false')
    expect(requirement(wrapper, 'Uma letra maiúscula')?.attributes('data-met')).toBe('false')
  })

  it('requires the password and its confirmation', async () => {
    const { wrapper, account } = await render()

    await submit(wrapper, '', '')

    expect(wrapper.text()).toContain('A senha não atende aos requisitos')
    expect(wrapper.text()).toContain('Campo obrigatório')
    expect(account.recoverPassword).not.toHaveBeenCalled()
  })

  it('rejects a password that does not meet the requirements', async () => {
    const { wrapper, account } = await render()

    await submit(wrapper, 'caderno', 'caderno')

    expect(wrapper.text()).toContain('A senha não atende aos requisitos')
    expect(account.recoverPassword).not.toHaveBeenCalled()
  })

  it('rejects a confirmation that differs from the password', async () => {
    const { wrapper, account } = await render()

    await submit(wrapper, 'Caderno1', 'other')

    expect(wrapper.text()).toContain('A confirmação deve ser igual à senha')
    expect(account.recoverPassword).not.toHaveBeenCalled()
  })

  it('sends the token and email from the link with the new password', async () => {
    const { wrapper, router, account } = await render()

    await submit(wrapper, 'Caderno1', 'Caderno1')

    expect(account.recoverPassword).toHaveBeenCalledWith({
      token: 'abc',
      email: 'ana@example.com',
      password: 'Caderno1',
    })
    expect(toast.success).toHaveBeenCalledWith('Sucesso!', {
      description: 'Senha recuperada, realize login para continuar',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('sends empty values when the link carries no token', async () => {
    const { wrapper, account } = await render({ query: '' })

    await submit(wrapper, 'Caderno1', 'Caderno1')

    expect(account.recoverPassword).toHaveBeenCalledWith({
      token: '',
      email: '',
      password: 'Caderno1',
    })
  })

  it('stays on the page when the recovery fails', async () => {
    const { wrapper, router, account } = await render()
    vi.mocked(account.recoverPassword).mockRejectedValue(new ApiError(null, 400))

    await submit(wrapper, 'Caderno1', 'Caderno1')

    expect(toast.success).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('disables the button while the request runs', async () => {
    const { wrapper } = await render({ loading: true })

    const button = wrapper.find('button[type="submit"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('Salvando…')
  })
})
