import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { authApi } from '@/api/auth'
import { Select } from '@/components/ui/select'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useLanguageStore } from '@/stores/language'
import { problem, settle } from '@/test/crud'
import { createTestPlugins } from '@/test/mounting'
import type { Role, SessionResponse } from '@/types'
import ProfileView from '@/views/profile/ProfileView.vue'

vi.mock('@/api/auth')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const session: SessionResponse = {
  name: 'Ana Souza',
  email: 'ana@example.com',
  status: 'APPROVED',
  language: 'PT_BR',
  roles: ['FINANCIAL', 'REGISTRATION'],
  dueDateNotices: true,
}

async function render(overrides: Partial<SessionResponse> = {}) {
  const roles: Role[] = overrides.roles ?? session.roles
  const { router, plugins } = createTestPlugins({
    initialState: { auth: { session: { ...session, ...overrides, roles } } },
    stubActions: false,
    routes: [
      { path: '/', name: 'start', component: { render: () => h('div') } },
      { path: '/profile', name: 'profile', component: { render: () => h('div') } },
    ],
  })
  await router.push('/profile')
  const wrapper = mount(ProfileView, { attachTo: document.body, global: { plugins } })
  useLanguageStore()
  await flushPromises()
  return { wrapper, router }
}

type Wrapper = Awaited<ReturnType<typeof render>>['wrapper']

function noticeSwitch(wrapper: Wrapper) {
  return wrapper.find('button[role="switch"]')
}

async function save(wrapper: Wrapper) {
  await wrapper.find('form').trigger('submit')
  await settle()
}

describe('ProfileView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
    window.history.replaceState(null, '')
  })

  it('shows the data of the user, read only, and the language', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Perfil')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe('Seus dados e avisos.')
    expect(wrapper.text()).toContain('O e-mail não muda.')
    const name = wrapper.find('#profile-name').element as HTMLInputElement
    const email = wrapper.find('#profile-email').element as HTMLInputElement
    expect(name.value).toBe('Ana Souza')
    expect(name.readOnly).toBe(true)
    expect(email.value).toBe('ana@example.com')
    expect(email.readOnly).toBe(true)
    expect(wrapper.findComponent(Select).props('modelValue')).toBe('pt-BR')
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual([
      'Dados',
      'Avisos de vencimento',
    ])
  })

  it('shows the notices switch with its help and what each notice is', async () => {
    const { wrapper } = await render()

    expect(wrapper.text()).toContain('Receber os avisos de vencimento por e-mail')
    expect(wrapper.text()).toContain('Ligado.')
    expect(noticeSwitch(wrapper).attributes('aria-checked')).toBe('true')
    expect(wrapper.find('[data-slot="notice-kinds"]').text()).toContain(
      'Diário: um e-mail por dia, só quando algo vence naquele dia.',
    )
    expect(wrapper.find('[data-slot="notice-kinds"]').text()).toContain(
      'Semanal: toda sexta, um resumo dos vencimentos da semana seguinte. Sem vencimentos, nada é enviado.',
    )

    await noticeSwitch(wrapper).trigger('click')
    expect(wrapper.text()).toContain('Desligado.')
  })

  it('hides the notices from who cannot receive them', async () => {
    const { wrapper } = await render({ roles: ['REGISTRATION'] })

    expect(wrapper.find('button[role="switch"]').exists()).toBe(false)
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual(['Dados'])
  })

  it('saves only the notices when only they changed, and says they were turned off', async () => {
    const { wrapper } = await render()
    vi.mocked(authApi.updateDueDateNotices).mockResolvedValue({ ...session, dueDateNotices: false })

    await noticeSwitch(wrapper).trigger('click')
    expect(wrapper.text()).toContain('Alterações não salvas')
    await save(wrapper)

    expect(authApi.updateDueDateNotices).toHaveBeenCalledWith(false)
    expect(authApi.changeLanguage).not.toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Perfil salvo', {
      description: 'Os avisos de vencimento foram desligados.',
      duration: 4000,
    })
    expect(wrapper.text()).not.toContain('Alterações não salvas')
    expect(noticeSwitch(wrapper).attributes('aria-checked')).toBe('false')
  })

  it('saves only the language when only it changed, switching the interface', async () => {
    const { wrapper } = await render()
    vi.mocked(authApi.changeLanguage).mockResolvedValue({ ...session, language: 'EN_US' })

    wrapper.findComponent(Select).vm.$emit('update:modelValue', 'en-US')
    await settle()
    await save(wrapper)

    expect(authApi.changeLanguage).toHaveBeenCalledWith('EN_US')
    expect(authApi.updateDueDateNotices).not.toHaveBeenCalled()
    expect(useLanguageStore().locale).toBe('en-US')
    expect(toast.success).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ duration: 4000 }),
    )
  })

  it('says the notices stay on when they were not touched', async () => {
    const { wrapper } = await render()
    vi.mocked(authApi.changeLanguage).mockResolvedValue({ ...session, language: 'EN_US' })

    wrapper.findComponent(Select).vm.$emit('update:modelValue', 'en-US')
    await settle()
    await save(wrapper)

    expect(toast.success).toHaveBeenCalledWith('Profile saved', {
      description: 'The due date notices are still on.',
      duration: 4000,
    })
  })

  it('saves both when both changed', async () => {
    const { wrapper } = await render()
    vi.mocked(authApi.changeLanguage).mockResolvedValue({ ...session, language: 'EN_US' })
    vi.mocked(authApi.updateDueDateNotices).mockResolvedValue({
      ...session,
      language: 'EN_US',
      dueDateNotices: false,
    })

    wrapper.findComponent(Select).vm.$emit('update:modelValue', 'en-US')
    await noticeSwitch(wrapper).trigger('click')
    await save(wrapper)

    expect(authApi.changeLanguage).toHaveBeenCalledOnce()
    expect(authApi.updateDueDateNotices).toHaveBeenCalledWith(false)
  })

  it('says nothing about the notices to who does not receive them', async () => {
    const { wrapper } = await render({ roles: ['REGISTRATION'] })
    vi.mocked(authApi.changeLanguage).mockResolvedValue({
      ...session,
      roles: ['REGISTRATION'],
      language: 'EN_US',
    })

    wrapper.findComponent(Select).vm.$emit('update:modelValue', 'en-US')
    await settle()
    await save(wrapper)

    expect(toast.success).toHaveBeenCalledWith('Profile saved', {
      description: undefined,
      duration: 4000,
    })
  })

  it('shows what the server refuses and keeps the changes', async () => {
    const { wrapper } = await render()
    vi.mocked(authApi.updateDueDateNotices).mockRejectedValue(problem(500))

    await noticeSwitch(wrapper).trigger('click')
    await save(wrapper)

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
    expect(toast.success).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Alterações não salvas')
  })

  it('goes back to the previous page on cancel', async () => {
    const { wrapper, router } = await render()
    const back = vi.spyOn(router, 'back').mockImplementation(() => undefined)
    window.history.replaceState({ back: '/financial' }, '')

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Cancelar')!
      .trigger('click')

    expect(back).toHaveBeenCalledOnce()
  })

  it('goes to the start when there is no previous page', async () => {
    const { wrapper, router } = await render()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Cancelar')!
      .trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('start')
  })

  it('asks before leaving with unsaved changes', async () => {
    const { wrapper, router } = await render()
    const dialog = useConfirmDialog()

    await noticeSwitch(wrapper).trigger('click')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Cancelar')!
      .trigger('click')
    await flushPromises()
    expect(dialog.state.options.title).toBe('Sair sem salvar?')
    dialog.cancel()
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('profile')
  })
})
