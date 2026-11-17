import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { rolesApi } from '@/api/roles'
import { usersApi } from '@/api/users'
import { Select } from '@/components/ui/select'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, problem, settle } from '@/test/crud'
import type { UserView } from '@/types'
import UserFormView from '@/views/configuration/users/UserFormView.vue'

vi.mock('@/api/users')
vi.mock('@/api/roles')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const existing: UserView = {
  id: 'u-2',
  active: false,
  name: 'Bruno',
  email: 'bruno@example.com',
  defaultLanguage: 'EN_US',
  authorities: ['FINANCIAL'],
}

type Wrapper = Awaited<ReturnType<typeof mountView>>['wrapper']

function field(wrapper: Wrapper, name: string) {
  return wrapper.find(`[name="${name}"]`)
}

function roleBox(wrapper: Wrapper, role: string) {
  return wrapper.find(`button#roles-${role}`)
}

function checkboxes(wrapper: Wrapper) {
  return wrapper.findAll('button[role="checkbox"]')
}

function activationBox(wrapper: Wrapper) {
  const boxes = checkboxes(wrapper)
  return boxes[boxes.length - 1]!
}

async function render(props: Record<string, unknown> = {}) {
  vi.mocked(rolesApi.findAll).mockResolvedValue(['ADMINISTRATION', 'FINANCIAL', 'REGISTRATION'])
  return mountView(UserFormView, 'users', props)
}

async function submit(wrapper: Wrapper) {
  await wrapper.find('form').trigger('submit')
  await settle()
}

async function fillNewUser(wrapper: Wrapper) {
  await field(wrapper, 'name').setValue('Ana')
  await field(wrapper, 'email').setValue('ana@example.com')
  await field(wrapper, 'password').setValue('secret-123')
  await roleBox(wrapper, 'REGISTRATION').trigger('click')
  await settle()
}

describe('UserFormView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  describe('creating', () => {
    it('loads the roles to choose from and shows the creation fields', async () => {
      const { wrapper } = await render()

      expect(rolesApi.findAll).toHaveBeenCalledOnce()
      expect(wrapper.text()).toContain('Novo usuário')
      expect(wrapper.text()).toContain('Administração')
      expect(wrapper.text()).toContain('Cadastros')
      expect(field(wrapper, 'password').exists()).toBe(true)
      expect(wrapper.text()).toContain('Português (Brasil)')
      expect(checkboxes(wrapper)).toHaveLength(4)
      expect(activationBox(wrapper).attributes('aria-checked')).toBe('true')
      expect(wrapper.find('label[for]').exists()).toBe(true)
      expect(usersApi.findById).not.toHaveBeenCalled()
    })

    it('asks for the required fields, including at least one role', async () => {
      const { wrapper } = await render()

      await submit(wrapper)

      expect(wrapper.text()).toContain('Campo obrigatório')
      expect(useConfirmDialog().state.open).toBe(false)
      expect(usersApi.create).not.toHaveBeenCalled()
    })

    it('creates the user only after confirming, asking for the activation e-mail', async () => {
      vi.mocked(usersApi.create).mockResolvedValue(undefined)
      const { wrapper } = await render()
      await fillNewUser(wrapper)

      await submit(wrapper)
      const dialog = useConfirmDialog()

      expect(dialog.state.open).toBe(true)
      expect(dialog.state.options.description).toContain('Ana')
      expect(usersApi.create).not.toHaveBeenCalled()

      dialog.accept()
      await settle()

      expect(usersApi.create).toHaveBeenCalledWith({
        name: 'Ana',
        email: 'ana@example.com',
        password: 'secret-123',
        defaultLanguage: 'PT_BR',
        roles: ['REGISTRATION'],
        sendActivationEmail: true,
      })
      expect(toast.success).toHaveBeenCalledWith('Registro criado', {
        description: 'Usuário criado com sucesso',
        duration: 4000,
      })
      expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('')
    })

    it('sends the chosen language, roles and activation preference', async () => {
      vi.mocked(usersApi.create).mockResolvedValue(undefined)
      const { wrapper } = await render()
      await fillNewUser(wrapper)
      await roleBox(wrapper, 'FINANCIAL').trigger('click')
      await roleBox(wrapper, 'REGISTRATION').trigger('click')
      wrapper.getComponent(Select).vm.$emit('update:modelValue', 'EN_US')
      await activationBox(wrapper).trigger('click')
      await settle()

      await submit(wrapper)
      useConfirmDialog().accept()
      await settle()

      expect(usersApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultLanguage: 'EN_US',
          roles: ['FINANCIAL'],
          sendActivationEmail: false,
        }),
      )
    })

    it('creates nothing and keeps the values when the confirmation is refused', async () => {
      const { wrapper } = await render()
      await fillNewUser(wrapper)

      await submit(wrapper)
      useConfirmDialog().cancel()
      await settle()

      expect(usersApi.create).not.toHaveBeenCalled()
      expect(toast.success).not.toHaveBeenCalled()
      expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('Ana')
    })

    it('shows that the e-mail is already in use', async () => {
      vi.mocked(usersApi.create).mockRejectedValue(
        problem(409, { error: 'conflicting-properties', parameters: { 'user.email': 'a@b.c' } }),
      )
      const { wrapper } = await render()
      await fillNewUser(wrapper)

      await submit(wrapper)
      useConfirmDialog().accept()
      await settle()

      expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
        'Email "a@b.c" já esta em uso',
      )
      expect(toast.success).not.toHaveBeenCalled()
    })

    it('shows the server error when the roles cannot be loaded', async () => {
      vi.mocked(rolesApi.findAll).mockRejectedValue(problem(500))

      const { wrapper } = await mountView(UserFormView, 'users')

      expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
        'Tente novamente mais tarde',
      )
    })

    it('goes back to the listing', async () => {
      const { wrapper, router } = await render()

      await buttonWithText(wrapper, 'Voltar').trigger('click')
      await settle()

      expect(router.currentRoute.value.name).toBe('users')
    })
  })

  describe('editing', () => {
    it('loads the user with the e-mail locked and no password nor activation fields', async () => {
      vi.mocked(usersApi.findById).mockResolvedValue(existing)

      const { wrapper } = await render({ id: 'u-2' })

      expect(usersApi.findById).toHaveBeenCalledWith('u-2')
      expect(wrapper.text()).toContain('Editando usuário')
      expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('Bruno')
      expect((field(wrapper, 'email').element as HTMLInputElement).value).toBe('bruno@example.com')
      expect(field(wrapper, 'email').attributes('disabled')).toBeDefined()
      expect(field(wrapper, 'password').exists()).toBe(false)
      expect(checkboxes(wrapper)).toHaveLength(3)
      expect(wrapper.text()).toContain('Inglês (Estados Unidos)')
      expect(roleBox(wrapper, 'FINANCIAL').attributes('aria-checked')).toBe('true')
      expect(roleBox(wrapper, 'REGISTRATION').attributes('aria-checked')).toBe('false')
      expect(buttonWithText(wrapper, 'Inativo').attributes('aria-pressed')).toBe('true')
    })

    it('saves the new roles and status only after confirming, without e-mail nor password', async () => {
      vi.mocked(usersApi.findById).mockResolvedValue(existing)
      vi.mocked(usersApi.update).mockResolvedValue(existing)
      const { wrapper } = await render({ id: 'u-2' })

      await roleBox(wrapper, 'REGISTRATION').trigger('click')
      await buttonWithText(wrapper, 'Ativo').trigger('click')
      await submit(wrapper)

      expect(useConfirmDialog().state.options.description).toContain('Bruno')
      expect(usersApi.update).not.toHaveBeenCalled()

      useConfirmDialog().accept()
      await settle()

      expect(usersApi.update).toHaveBeenCalledWith('u-2', {
        active: true,
        name: 'Bruno',
        defaultLanguage: 'EN_US',
        roles: ['FINANCIAL', 'REGISTRATION'],
      })
      expect(toast.success).toHaveBeenCalledWith('Registro atualizado', {
        description: 'Usuário atualizado com sucesso',
        duration: 4000,
      })
    })

    it('does not save when the confirmation is refused', async () => {
      vi.mocked(usersApi.findById).mockResolvedValue(existing)
      const { wrapper } = await render({ id: 'u-2' })

      await submit(wrapper)
      useConfirmDialog().cancel()
      await settle()

      expect(usersApi.update).not.toHaveBeenCalled()
      expect(toast.success).not.toHaveBeenCalled()
    })

    it('does not let every role be removed', async () => {
      vi.mocked(usersApi.findById).mockResolvedValue(existing)
      const { wrapper } = await render({ id: 'u-2' })

      await roleBox(wrapper, 'FINANCIAL').trigger('click')
      await submit(wrapper)

      expect(wrapper.text()).toContain('Campo obrigatório')
      expect(usersApi.update).not.toHaveBeenCalled()
    })

    it('shows the server error when the user cannot be loaded', async () => {
      vi.mocked(usersApi.findById).mockRejectedValue(problem(404))

      const { wrapper } = await render({ id: 'u-9' })

      expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
        'O recurso solicitado não existe',
      )
    })

    it('shows the server error when the update is rejected', async () => {
      vi.mocked(usersApi.findById).mockResolvedValue(existing)
      vi.mocked(usersApi.update).mockRejectedValue(problem(422))
      const { wrapper } = await render({ id: 'u-2' })

      await submit(wrapper)
      useConfirmDialog().accept()
      await settle()

      expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
        'Revise os dados e tente novamente',
      )
    })
  })
})
