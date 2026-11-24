import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { ApiError } from '@/api/client'
import PasswordTab from '@/components/account/PasswordTab.vue'
import { installZodErrorMap } from '@/schemas/zodErrorMap'
import { useAuthStore } from '@/stores/auth'
import { createTestPlugins } from '@/test/mounting'
import { settle } from '@/test/settle'

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

function render(hasPassword = true) {
  installZodErrorMap()
  const { plugins } = createTestPlugins({
    initialState: {
      auth: { session: { name: 'Maria', email: 'maria@exemplo.com.br', hasPassword } },
    },
  })
  return mount(PasswordTab, { attachTo: document.body, global: { plugins } })
}

async function fill(
  wrapper: ReturnType<typeof render>,
  current = 'segredo-antigo',
  next = 'Caderno2026',
  confirmation = next,
) {
  const inputs = wrapper.findAll('input')
  await inputs[0]!.setValue(current)
  await inputs[1]!.setValue(next)
  await inputs[2]!.setValue(confirmation)
}

async function submit(wrapper: ReturnType<typeof render>) {
  await wrapper.get('form').trigger('submit')
  await settle()
}

describe('PasswordTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts with the notice about the other sessions, before the fields', () => {
    const wrapper = render()

    const text = wrapper.text()
    expect(text).toContain('Ao trocar a senha, as outras sessões são encerradas.')
    expect(text.indexOf('Ao trocar a senha')).toBeLessThan(text.indexOf('Senha atual'))
    expect(text).toContain('Nova senha')
    expect(text).toContain('Confirme a nova senha')
    expect(wrapper.get('button[type="submit"]').text()).toBe('Salvar nova senha')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('lists the requirements while the password is typed', async () => {
    const wrapper = render()

    await wrapper.findAll('input')[1]!.setValue('Caderno1')

    expect(wrapper.get('[data-slot="password-requirements"]').text()).toContain('Um número')
    expect(wrapper.find('[data-slot="password-bytes"]').exists()).toBe(false)
  })

  it('swaps a Google only account for the notice', () => {
    const wrapper = render(false)

    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.get('[data-slot="google-notice"]').text()).toContain('Você entra com o Google')
  })

  it('changes the password, says so and clears the form', async () => {
    const wrapper = render()
    const auth = useAuthStore()
    vi.mocked(auth.changePassword).mockResolvedValue()

    await fill(wrapper)
    await submit(wrapper)

    expect(auth.changePassword).toHaveBeenCalledWith({
      currentPassword: 'segredo-antigo',
      newPassword: 'Caderno2026',
    })
    expect(toast.success).toHaveBeenCalledWith('Senha trocada', {
      description: 'As outras sessões foram encerradas.',
      duration: 4000,
    })
    expect(
      wrapper.findAll('input').map((input) => (input.element as HTMLInputElement).value),
    ).toEqual(['', '', ''])
  })

  it('shows the wrong current password in an alert and marks only the field', async () => {
    const wrapper = render()
    const auth = useAuthStore()
    vi.mocked(auth.changePassword).mockRejectedValue(
      new ApiError({ error: 'invalid_current_password' }, 400),
    )

    await fill(wrapper)
    await submit(wrapper)

    const alert = wrapper.get('[role="alert"]')
    expect(alert.text()).toContain('Não foi possível trocar a senha')
    expect(alert.text()).toContain('A senha atual não confere. Confira e tente de novo.')
    const inputs = wrapper.findAll('input')
    expect(inputs[0]!.attributes('aria-invalid')).toBe('true')
    expect(inputs[0]!.attributes('aria-describedby')).toContain(alert.attributes('id'))
    expect(inputs[1]!.attributes('aria-invalid')).not.toBe('true')
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('shows the too many attempts in an alert without marking a field', async () => {
    const wrapper = render()
    const auth = useAuthStore()
    vi.mocked(auth.changePassword).mockRejectedValue(
      new ApiError({ error: 'too_many_password_change_attempts' }, 429),
    )

    await fill(wrapper)
    await submit(wrapper)

    const alert = wrapper.get('[role="alert"]')
    expect(alert.text()).toContain('Muitas tentativas seguidas')
    expect(alert.text()).toContain('Tente novamente em alguns segundos.')
    expect(wrapper.findAll('input')[0]!.attributes('aria-invalid')).not.toBe('true')
  })

  it('clears the alert on the next attempt', async () => {
    const wrapper = render()
    const auth = useAuthStore()
    vi.mocked(auth.changePassword)
      .mockRejectedValueOnce(new ApiError({ error: 'invalid_current_password' }, 400))
      .mockResolvedValueOnce()

    await fill(wrapper)
    await submit(wrapper)
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)

    await fill(wrapper, 'segredo-novo')
    await submit(wrapper)

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('leaves any other api failure to the default notice', async () => {
    const wrapper = render()
    const auth = useAuthStore()
    vi.mocked(auth.changePassword).mockRejectedValue(new ApiError({ error: 'internal-error' }, 500))

    await fill(wrapper)
    await submit(wrapper)

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('leaves an api failure without a code to the default notice too', async () => {
    const wrapper = render()
    const auth = useAuthStore()
    vi.mocked(auth.changePassword).mockRejectedValue(new ApiError(null, 500))

    await fill(wrapper)
    await submit(wrapper)

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('leaves a failure that is not from the api alone too', async () => {
    const wrapper = render()
    const auth = useAuthStore()
    vi.mocked(auth.changePassword).mockRejectedValue(new Error('boom'))

    await fill(wrapper)
    await submit(wrapper)

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('says the confirmation differs under the field', async () => {
    const wrapper = render()
    const auth = useAuthStore()

    await fill(wrapper, 'segredo-antigo', 'Caderno2026', 'Caderno2062')
    await submit(wrapper)

    expect(auth.changePassword).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('A confirmação deve ser igual à senha')
  })

  it('counts the bytes under the field when the new password is over the limit', async () => {
    const wrapper = render()
    const auth = useAuthStore()
    const long = 'Minha frase-senha do caderno verde é ótima e não esqueço jamais ção'

    await fill(wrapper, 'segredo-antigo', long)
    await submit(wrapper)

    expect(auth.changePassword).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('A senha pode ter no máximo 72 bytes')
    expect(wrapper.get('[data-slot="password-bytes"]').text()).toBe(
      '73 de 72 bytes. Acentos e emojis contam mais de um.',
    )
    expect(wrapper.find('[data-slot="password-requirements"]').exists()).toBe(false)
  })

  it('shows Salvando while the request runs', async () => {
    const wrapper = render()
    const auth = useAuthStore()
    vi.mocked(auth.changePassword).mockReturnValue(new Promise(() => undefined))

    await fill(wrapper)
    await submit(wrapper)

    const button = wrapper.get('button[type="submit"]')
    expect(button.text()).toBe('Salvando…')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('aria-busy')).toBe('true')
    expect(wrapper.find('svg.animate-spin').exists()).toBe(true)
  })
})
