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

function activationSwitch(wrapper: Wrapper) {
  return wrapper.find('button[role="switch"]')
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
      expect(wrapper.text()).toContain('Configurações')
      expect(wrapper.text()).toContain('Cadastros')
      expect(field(wrapper, 'password').exists()).toBe(true)
      expect(wrapper.text()).toContain('Português (Brasil)')
      expect(checkboxes(wrapper)).toHaveLength(3)
      expect(wrapper.text()).toContain('Lançar receitas e despesas e fechar períodos.')
      expect(activationSwitch(wrapper).attributes('aria-checked')).toBe('true')
      expect(wrapper.find('label[for]').exists()).toBe(true)
      expect(usersApi.findById).not.toHaveBeenCalled()
    })

    it('asks for the required fields, including at least one role', async () => {
      const { wrapper } = await render()

      await submit(wrapper)

      expect(wrapper.text()).toContain('Campo obrigatório')
      expect(wrapper.text()).toContain('Escolha pelo menos uma área.')
      expect(useConfirmDialog().state.open).toBe(false)
      expect(usersApi.create).not.toHaveBeenCalled()
    })

    it('creates the user only after confirming, asking for the activation e-mail', async () => {
      vi.mocked(usersApi.create).mockResolvedValue('u-9')
      const { wrapper } = await render()
      await fillNewUser(wrapper)

      await submit(wrapper)
      const dialog = useConfirmDialog()

      expect(dialog.state.open).toBe(true)
      expect(dialog.state.options.title).toBe('Criar o usuário “Ana”?')
      expect(dialog.state.options.confirmLabel).toBe('Criar usuário')
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
      expect(toast.success).toHaveBeenCalledWith('Usuário criado', {
        description: '“Ana” foi cadastrado.',
        duration: 4000,
      })
      expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('')
    })

    it('sends the chosen language, roles and activation preference', async () => {
      vi.mocked(usersApi.create).mockResolvedValue('u-9')
      const { wrapper } = await render()
      await fillNewUser(wrapper)
      await roleBox(wrapper, 'FINANCIAL').trigger('click')
      await roleBox(wrapper, 'REGISTRATION').trigger('click')
      wrapper.getComponent(Select).vm.$emit('update:modelValue', 'EN_US')
      await activationSwitch(wrapper).trigger('click')
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

      await buttonWithText(wrapper, 'Cancelar').trigger('click')
      await settle()

      expect(router.currentRoute.value.name).toBe('users')
    })
  })

  describe('editing', () => {
    it('loads the user with the e-mail locked and no password nor activation fields', async () => {
      vi.mocked(usersApi.findById).mockResolvedValue(existing)

      const { wrapper } = await render({ id: 'u-2' })

      expect(usersApi.findById).toHaveBeenCalledWith('u-2')
      expect(wrapper.find('h1').text()).toBe('Bruno')
      expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('Bruno')
      expect((field(wrapper, 'email').element as HTMLInputElement).value).toBe('bruno@example.com')
      expect(field(wrapper, 'email').attributes('disabled')).toBeDefined()
      expect(field(wrapper, 'password').exists()).toBe(false)
      expect(checkboxes(wrapper)).toHaveLength(3)
      expect(wrapper.text()).toContain('Inglês (Estados Unidos)')
      expect(roleBox(wrapper, 'FINANCIAL').attributes('aria-checked')).toBe('true')
      expect(roleBox(wrapper, 'REGISTRATION').attributes('aria-checked')).toBe('false')
      expect(wrapper.find('button[role="switch"]').attributes('aria-checked')).toBe('false')
    })

    it('saves the new roles and status only after confirming, without e-mail nor password', async () => {
      vi.mocked(usersApi.findById).mockResolvedValue(existing)
      vi.mocked(usersApi.update).mockResolvedValue(existing)
      const { wrapper } = await render({ id: 'u-2' })

      await roleBox(wrapper, 'REGISTRATION').trigger('click')
      await wrapper.find('button[role="switch"]').trigger('click')
      await submit(wrapper)

      expect(useConfirmDialog().state.options.title).toBe('Salvar as alterações de “Bruno”?')
      expect(usersApi.update).not.toHaveBeenCalled()

      useConfirmDialog().accept()
      await settle()

      expect(usersApi.update).toHaveBeenCalledWith('u-2', {
        active: true,
        name: 'Bruno',
        defaultLanguage: 'EN_US',
        roles: ['FINANCIAL', 'REGISTRATION'],
      })
      expect(toast.success).toHaveBeenCalledWith('Alterações salvas', {
        description: 'Os dados de “Bruno” foram salvos.',
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

      expect(wrapper.text()).toContain('Escolha pelo menos uma área.')
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

    describe('the side column with the account', () => {
      const session = { name: 'Ana', email: 'ana@example.com', status: 'APPROVED', roles: [] }

      async function renderExisting(initialState: Record<string, unknown> = {}) {
        vi.mocked(usersApi.findById).mockResolvedValue(existing)
        vi.mocked(rolesApi.findAll).mockResolvedValue(['ADMINISTRATION', 'FINANCIAL'])
        return mountView(UserFormView, 'users', { id: 'u-2' }, initialState)
      }

      it('shows the e-mail under the name, the status, the language and the areas of the account', async () => {
        const { wrapper } = await renderExisting()

        expect(wrapper.find('[data-slot="page-description"]').text()).toBe('bruno@example.com')
        expect(wrapper.find('dl').text()).toContain('Inativo')
        expect(wrapper.find('dl').text()).toContain('Inglês (Estados Unidos)')
        expect(wrapper.find('dl').text()).toContain('Financeiro')
      })

      it('resets the password of the user being edited', async () => {
        vi.mocked(usersApi.updatePassword).mockResolvedValue(undefined)
        const { wrapper } = await renderExisting({ auth: { session } })

        await buttonWithText(wrapper, 'Redefinir senha').trigger('click')
        await settle()

        expect(document.body.textContent).toContain('Redefinir a senha de Bruno?')

        document.body
          .querySelector('[role="dialog"]')!
          .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        await settle()
        expect(document.body.querySelector('[role="dialog"]')).toBeNull()
      })

      it('removes the user after confirming and goes back to the listing, without asking to discard', async () => {
        vi.mocked(usersApi.remove).mockResolvedValue(undefined)
        const { wrapper, router } = await renderExisting({ auth: { session } })
        await field(wrapper, 'name').setValue('Bruno Souza')
        const dialog = useConfirmDialog()

        await buttonWithText(wrapper, 'Remover usuário').trigger('click')
        await settle()
        expect(dialog.state.options.title).toBe('Remover o usuário “Bruno”?')
        dialog.accept()
        await settle()

        expect(usersApi.remove).toHaveBeenCalledWith('u-2')
        expect(toast.success).toHaveBeenCalledWith('Usuário removido', {
          description: '“Bruno” saiu da lista.',
          duration: 4000,
        })
        expect(dialog.state.options.title).toBe('Remover o usuário “Bruno”?')
        expect(router.currentRoute.value.name).toBe('users')
      })

      it('keeps the user when the removal is not confirmed or the server refuses it', async () => {
        const { wrapper, router } = await renderExisting({ auth: { session } })

        await buttonWithText(wrapper, 'Remover usuário').trigger('click')
        await settle()
        useConfirmDialog().cancel()
        await settle()
        expect(usersApi.remove).not.toHaveBeenCalled()

        vi.mocked(usersApi.remove).mockRejectedValue(problem(500))
        await buttonWithText(wrapper, 'Remover usuário').trigger('click')
        await settle()
        useConfirmDialog().accept()
        await settle()

        expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
          'Tente novamente mais tarde',
        )
        expect(router.currentRoute.value.name).not.toBe('users')
      })

      it('offers no action on the account of whoever is logged in', async () => {
        const { wrapper } = await renderExisting({
          auth: { session: { ...session, email: 'bruno@example.com' } },
        })

        expect(buttonWithText(wrapper, 'Redefinir senha').attributes('disabled')).toBeDefined()
        expect(buttonWithText(wrapper, 'Remover usuário').attributes('disabled')).toBeDefined()
      })
    })
  })
})
