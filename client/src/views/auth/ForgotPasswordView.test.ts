import { mount } from '@vue/test-utils'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { ApiError } from '@/api/client'
import { installZodErrorMap } from '@/schemas/zodErrorMap'
import { useAccountStore } from '@/stores/account'
import { createTestPlugins } from '@/test/mounting'
import { settle } from '@/test/settle'
import ForgotPasswordView from '@/views/auth/ForgotPasswordView.vue'

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

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

    expect(wrapper.text()).toContain('Recuperar senha')
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/login"]').text()).toBe('Voltar')
  })

  it('validates the email before sending', async () => {
    const { wrapper, account } = await render()

    await submit(wrapper, 'nope')

    expect(wrapper.text()).toContain('Informe um email válido')
    expect(account.forgotPassword).not.toHaveBeenCalled()
  })

  it('requests the recovery, confirms it and clears the form', async () => {
    const { wrapper, account } = await render()

    await submit(wrapper, 'ana@example.com')

    expect(account.forgotPassword).toHaveBeenCalledWith({ email: 'ana@example.com' })
    expect(toast.success).toHaveBeenCalledWith('Sucesso!', {
      description: 'Solicitação realizada, aguarde pelo email de recuperação',
      duration: 4000,
    })
    expect((wrapper.find('input[type="email"]').element as HTMLInputElement).value).toBe('')
  })

  it('keeps the form when the request fails', async () => {
    const { wrapper, account } = await render()
    vi.mocked(account.forgotPassword).mockRejectedValue(new ApiError(null, 404))

    await submit(wrapper, 'ana@example.com')

    expect(toast.success).not.toHaveBeenCalled()
    expect((wrapper.find('input[type="email"]').element as HTMLInputElement).value).toBe(
      'ana@example.com',
    )
  })

  it('disables the button while the request runs', async () => {
    const { wrapper } = await render(true)

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })
})
