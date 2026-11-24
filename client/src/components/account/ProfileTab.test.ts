import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import ProfileTab from '@/components/account/ProfileTab.vue'
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

function render() {
  installZodErrorMap()
  const { plugins } = createTestPlugins({
    initialState: {
      auth: { session: { name: 'Maria Conceição', email: 'maria@exemplo.com.br' } },
    },
  })
  return mount(ProfileTab, { attachTo: document.body, global: { plugins } })
}

describe('ProfileTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the name to edit and the e-mail as read only', () => {
    const wrapper = render()

    const inputs = wrapper.findAll('input')
    expect(wrapper.text()).toContain('Nome')
    expect(wrapper.text()).toContain('E-mail')
    expect((inputs[0]!.element as HTMLInputElement).value).toBe('Maria Conceição')
    expect((inputs[1]!.element as HTMLInputElement).value).toBe('maria@exemplo.com.br')
    expect(inputs[1]!.attributes('readonly')).toBeDefined()
    expect(wrapper.get('button[type="submit"]').text()).toBe('Salvar')
  })

  it('saves the name and says the profile was saved', async () => {
    const wrapper = render()
    const auth = useAuthStore()
    vi.mocked(auth.changeName).mockResolvedValue()

    await wrapper.findAll('input')[0]!.setValue('Maria da Silva')
    await wrapper.get('form').trigger('submit')
    await settle()

    expect(auth.changeName).toHaveBeenCalledWith('Maria da Silva')
    expect(toast.success).toHaveBeenCalledWith('Perfil salvo', expect.anything())
  })

  it('does not save a blank name', async () => {
    const wrapper = render()
    const auth = useAuthStore()

    await wrapper.findAll('input')[0]!.setValue('')
    await wrapper.get('form').trigger('submit')
    await settle()

    expect(auth.changeName).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Campo obrigatório')
  })

  it('does not say it saved when the server refuses', async () => {
    const wrapper = render()
    const auth = useAuthStore()
    vi.mocked(auth.changeName).mockRejectedValue(new Error('refused'))

    await wrapper.get('form').trigger('submit')
    await settle()

    expect(auth.changeName).toHaveBeenCalledWith('Maria Conceição')
    expect(toast.success).not.toHaveBeenCalled()
  })
})
