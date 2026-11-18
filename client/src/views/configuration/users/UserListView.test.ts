import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { usersApi } from '@/api/users'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, pageOf, problem, settle } from '@/test/crud'
import type { UserView } from '@/types'
import UserListView from '@/views/configuration/users/UserListView.vue'

vi.mock('@/api/users')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const users: UserView[] = [
  {
    id: 'u-1',
    active: true,
    name: 'Admin',
    email: 'admin@example.com',
    defaultLanguage: 'PT_BR',
    authorities: ['ADMINISTRATION', 'REGISTRATION'],
  },
  {
    id: 'u-2',
    active: false,
    name: 'Bruno',
    email: 'bruno@example.com',
    defaultLanguage: 'EN_US',
    authorities: ['FINANCIAL'],
  },
]

const session = { name: 'Admin', email: 'admin@example.com', status: 'APPROVED', roles: [] }

async function render(content = users) {
  vi.mocked(usersApi.findAll).mockResolvedValue(pageOf(content))
  return mountView(UserListView, 'users', {}, { auth: { session } })
}

function rowOf(wrapper: Awaited<ReturnType<typeof render>>['wrapper'], name: string) {
  const row = wrapper.findAll('tbody tr').find((candidate) => candidate.text().includes(name))
  if (!row) {
    throw new Error(`no row for ${name}`)
  }
  return row
}

describe('UserListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('lists users of every status on mount, with the roles and the status of each one', async () => {
    const { wrapper } = await render()

    expect(usersApi.findAll).toHaveBeenCalledWith({
      filter: '',
      status: 'ALL',
      page: 0,
      size: 15,
      sort: 'createdOn,asc',
    })
    expect(rowOf(wrapper, 'Bruno').text()).toContain('bruno@example.com')
    expect(rowOf(wrapper, 'Bruno').text()).toContain('Financeiro')
    expect(rowOf(wrapper, 'Bruno').text()).toContain('Inativo')
    expect(rowOf(wrapper, 'Admin').text()).toContain('Administração, Cadastros')
    expect(rowOf(wrapper, 'Admin').text()).toContain('Ativo')
  })

  it('searches by the typed text and by status, and goes back to every status when cleared', async () => {
    const { wrapper } = await render()

    await wrapper.find('input').setValue('bru')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(usersApi.findAll).toHaveBeenLastCalledWith(expect.objectContaining({ filter: 'bru' }))

    await buttonWithText(wrapper, 'Ativos').trigger('click')
    await flushPromises()
    expect(usersApi.findAll).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'ACTIVE' }))

    await wrapper.find('button[aria-label="Limpar filtro"]').trigger('click')
    await flushPromises()
    expect(usersApi.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ filter: '', status: 'ALL' }),
    )
  })

  it('opens the forms to create and to edit a user', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Novo').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('users.create')

    await rowOf(wrapper, 'Bruno').find('button[aria-label="Editar"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('users.update')
    expect(router.currentRoute.value.params.id).toBe('u-2')
  })

  it('offers no action on the account of whoever is logged in', async () => {
    const { wrapper } = await render()

    const own = rowOf(wrapper, 'Admin')

    expect(own.text()).toContain('Sua conta')
    expect(own.findAll('button[aria-label]')).toHaveLength(0)
    expect(rowOf(wrapper, 'Bruno').findAll('button[aria-label]')).toHaveLength(3)
  })

  it('deletes a user only after confirming, naming the user in the question', async () => {
    const { wrapper } = await render()
    vi.mocked(usersApi.remove).mockResolvedValue(undefined)

    await rowOf(wrapper, 'Bruno').find('button[aria-label="Deletar"]').trigger('click')
    const dialog = useConfirmDialog()

    expect(dialog.state.open).toBe(true)
    expect(dialog.state.options.description).toContain('Bruno')
    expect(usersApi.remove).not.toHaveBeenCalled()

    dialog.accept()
    await flushPromises()

    expect(usersApi.remove).toHaveBeenCalledWith('u-2')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(toast.success).toHaveBeenCalledWith('Registro excluído', {
      description: 'Usuário excluído com sucesso',
      duration: 4000,
    })
  })

  it('keeps the user when the deletion is not confirmed', async () => {
    const { wrapper } = await render()

    await rowOf(wrapper, 'Bruno').find('button[aria-label="Deletar"]').trigger('click')
    useConfirmDialog().cancel()
    await flushPromises()

    expect(usersApi.remove).not.toHaveBeenCalled()
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('shows the server error when the listing fails', async () => {
    vi.mocked(usersApi.findAll).mockRejectedValue(problem(500))

    const { wrapper } = await mountView(UserListView, 'users')

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'Tente novamente mais tarde',
    )
  })

  describe('resetting a password', () => {
    function field(name: string) {
      return document.body.querySelector<HTMLInputElement>(`input[name="${name}"]`)!
    }

    async function type(name: string, value: string) {
      field(name).value = value
      field(name).dispatchEvent(new Event('input', { bubbles: true }))
      await settle()
    }

    async function submit() {
      document.body.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
      await settle()
    }

    async function open() {
      const { wrapper } = await render()
      await rowOf(wrapper, 'Bruno').find('button[aria-label="Redefinir senha"]').trigger('click')
      await settle()
      return wrapper
    }

    it('opens a dialog naming the user, closed until asked for', async () => {
      const { wrapper } = await render()
      expect(document.body.querySelector('form')).toBeNull()

      await rowOf(wrapper, 'Bruno').find('button[aria-label="Redefinir senha"]').trigger('click')
      await settle()

      expect(document.body.textContent).toContain('Informe a nova senha de Bruno')
    })

    it('sets a temporary password and closes the dialog', async () => {
      vi.mocked(usersApi.updatePassword).mockResolvedValue(undefined)
      await open()

      await type('password', 'new-secret-1')
      await type('confirmation', 'new-secret-1')
      await submit()

      expect(usersApi.updatePassword).toHaveBeenCalledWith('u-2', {
        temporary: true,
        password: 'new-secret-1',
      })
      expect(toast.success).toHaveBeenCalledWith('Registro atualizado', {
        description: 'Senha redefinida com sucesso',
        duration: 4000,
      })
      expect(document.body.querySelector('form')).toBeNull()
    })

    it('does not send a password that is too short or not confirmed', async () => {
      await open()

      await type('password', 'short')
      await type('confirmation', 'other')
      await submit()

      expect(document.body.textContent).toContain('Informe ao menos 8 caracteres')
      expect(document.body.textContent).toContain('A confirmação deve ser igual à senha')
      expect(usersApi.updatePassword).not.toHaveBeenCalled()
    })

    it('keeps the dialog open and shows the server error when the change fails', async () => {
      vi.mocked(usersApi.updatePassword).mockRejectedValue(problem(404))
      await open()

      await type('password', 'new-secret-1')
      await type('confirmation', 'new-secret-1')
      await submit()

      expect(document.body.querySelector('[data-slot="server-error"]')?.textContent).toContain(
        'O recurso solicitado não existe',
      )
      expect(toast.success).not.toHaveBeenCalled()
    })

    it('closes when the dialog is dismissed with Escape', async () => {
      await open()

      document.body
        .querySelector('[role="dialog"]')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await settle()

      expect(document.body.querySelector('form')).toBeNull()
    })

    it('closes with the cancel button and forgets what was typed and any error', async () => {
      vi.mocked(usersApi.updatePassword).mockRejectedValue(problem(404))
      const wrapper = await open()
      await type('password', 'new-secret-1')
      await type('confirmation', 'new-secret-1')
      await submit()

      const cancel = [...document.body.querySelectorAll('button')].find(
        (button) => button.textContent?.trim() === 'Cancelar',
      )!
      cancel.click()
      await settle()
      expect(document.body.querySelector('form')).toBeNull()

      await rowOf(wrapper, 'Bruno').find('button[aria-label="Redefinir senha"]').trigger('click')
      await settle()

      expect(field('password').value).toBe('')
      expect(document.body.querySelector('[data-slot="server-error"]')).toBeNull()
    })
  })
})
