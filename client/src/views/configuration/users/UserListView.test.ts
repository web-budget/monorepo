import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { usersApi } from '@/api/users'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import {
  buttonWithText,
  chooseRowAction,
  listingCalls,
  mountView,
  problem,
  serveListing,
  settle,
  stateOf,
  useCompactViewport,
} from '@/test/crud'
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
    name: 'Admin Silva',
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

const session = { name: 'Admin Silva', email: 'admin@example.com', status: 'APPROVED', roles: [] }

async function render(content = users) {
  serveListing(vi.mocked(usersApi.findAll), content)
  return mountView(UserListView, 'users', {}, { auth: { session } })
}

type Wrapper = Awaited<ReturnType<typeof render>>['wrapper']

function rowOf(wrapper: Wrapper, name: string) {
  const row = wrapper.findAll('tbody tr').find((candidate) => candidate.text().includes(name))
  if (!row) {
    throw new Error(`no row for ${name}`)
  }
  return row
}

function lastListingCall() {
  const calls = listingCalls(vi.mocked(usersApi.findAll))
  return calls[calls.length - 1]
}

function menuItem(label: string) {
  return [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
    (candidate) => candidate.textContent?.trim() === label,
  )!
}

describe('UserListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('lists users of every status on mount, with avatar, e-mail, areas and status', async () => {
    const { wrapper } = await render()

    expect(listingCalls(vi.mocked(usersApi.findAll))[0]).toEqual({
      filter: '',
      status: 'ALL',
      page: 0,
      size: 15,
      sort: 'createdOn,asc',
    })
    const bruno = rowOf(wrapper, 'Bruno')
    expect(bruno.text()).toContain('BR')
    expect(bruno.text()).toContain('bruno@example.com')
    expect(bruno.text()).toContain('Financeiro')
    expect(bruno.text()).toContain('Inativo')
    const admin = rowOf(wrapper, 'Admin Silva')
    expect(admin.text()).toContain('AS')
    expect(admin.findAll('td')[1]!.text()).toBe('CadastrosConfigurações')
    expect(admin.text()).toContain('Ativo')
  })

  it('counts the users of each status on the tabs, starting on all of them', async () => {
    const { wrapper } = await render()

    expect(buttonWithText(wrapper, 'Todos').attributes('aria-pressed')).toBe('true')
    expect(buttonWithText(wrapper, 'Ativos').text()).toBe('Ativos 4')
    expect(buttonWithText(wrapper, 'Inativos').text()).toBe('Inativos 1')
    expect(buttonWithText(wrapper, 'Todos').text()).toBe('Todos 5')
  })

  it('searches by the typed text and by status, and clears the text without touching the status', async () => {
    const { wrapper } = await render()

    await wrapper.find('input').setValue('bru')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(lastListingCall()).toMatchObject({ filter: 'bru' })

    await buttonWithText(wrapper, 'Ativos').trigger('click')
    await flushPromises()
    expect(lastListingCall()).toMatchObject({ status: 'ACTIVE' })

    await wrapper.find('button[aria-label="Limpar filtro"]').trigger('click')
    await flushPromises()
    expect(lastListingCall()).toMatchObject({
      filter: '',
      status: 'ACTIVE',
    })
  })

  it('opens the forms to create and to edit a user', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Novo usuário').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('users.create')

    await chooseRowAction(wrapper, 1, 'Editar')
    expect(router.currentRoute.value.name).toBe('users.update')
    expect(router.currentRoute.value.params.id).toBe('u-2')
  })

  describe('the account of whoever is logged in', () => {
    it('is marked as yours and offers no action in the menu', async () => {
      const { wrapper } = await render()
      const own = rowOf(wrapper, 'Admin Silva')

      expect(own.text()).toContain('(você)')
      expect(rowOf(wrapper, 'Bruno').text()).not.toContain('(você)')

      await own.find('button[aria-label="Mais ações"]').trigger('keydown', { key: 'Enter' })
      await flushPromises()

      expect(document.body.textContent).toContain('Sua conta')
      for (const label of ['Editar', 'Redefinir senha', 'Remover']) {
        expect(menuItem(label).getAttribute('data-disabled')).not.toBeNull()
      }
    })

    it('offers the actions on the accounts of other people', async () => {
      const { wrapper } = await render()

      await rowOf(wrapper, 'Bruno')
        .find('button[aria-label="Mais ações"]')
        .trigger('keydown', { key: 'Enter' })
      await flushPromises()

      expect(document.body.textContent).toContain('Bruno')
      for (const label of ['Editar', 'Redefinir senha', 'Remover']) {
        expect(menuItem(label).getAttribute('data-disabled')).toBeNull()
      }
    })
  })

  it('deletes a user only after confirming, naming the user in the question', async () => {
    const { wrapper } = await render()
    vi.mocked(usersApi.remove).mockResolvedValue(undefined)

    const dialog = useConfirmDialog()
    await chooseRowAction(wrapper, 1, 'Remover')

    expect(dialog.state.open).toBe(true)
    expect(dialog.state.options.title).toBe('Remover o usuário “Bruno”?')
    expect(usersApi.remove).not.toHaveBeenCalled()

    dialog.accept()
    await flushPromises()

    expect(usersApi.remove).toHaveBeenCalledWith('u-2')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(toast.success).toHaveBeenCalledWith('Usuário removido', {
      description: '“Bruno” saiu da lista.',
      duration: 4000,
    })
  })

  it('keeps the user when the deletion is not confirmed', async () => {
    const { wrapper } = await render()

    await chooseRowAction(wrapper, 1, 'Remover')
    useConfirmDialog().cancel()
    await flushPromises()

    expect(usersApi.remove).not.toHaveBeenCalled()
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('shows the server error when the listing fails, with a way to try again', async () => {
    vi.mocked(usersApi.findAll).mockRejectedValue(problem(500))

    const { wrapper } = await mountView(UserListView, 'users')

    expect(stateOf(wrapper)).toBe('error')
    expect(wrapper.find('[data-state="error"]').text()).toContain('Tente novamente mais tarde')

    serveListing(vi.mocked(usersApi.findAll), users)
    await buttonWithText(wrapper, 'Tentar de novo').trigger('click')
    await flushPromises()

    expect(stateOf(wrapper)).toBeUndefined()
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('invites to the first user when there is none, and offers to clear a search without result', async () => {
    serveListing(vi.mocked(usersApi.findAll), [], 0, { ACTIVE: 0, INACTIVE: 0, ALL: 0 })
    const { wrapper, router } = await mountView(UserListView, 'users')

    expect(stateOf(wrapper)).toBe('empty')
    await wrapper.find('[data-state="empty"] button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('users.create')

    serveListing(vi.mocked(usersApi.findAll), [], 0)
    await wrapper.find('input').setValue('zzz')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(stateOf(wrapper)).toBe('no-result')
    await buttonWithText(wrapper, 'Limpar busca').trigger('click')
    await flushPromises()
    expect(lastListingCall()).toMatchObject({ filter: '' })
  })

  describe('on a phone', () => {
    beforeEach(() => useCompactViewport(true))
    afterEach(() => useCompactViewport(false))

    function sheetButton(label: string) {
      return [...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(
        (candidate) => candidate.textContent?.trim() === label,
      )!
    }

    async function openSheet(wrapper: Wrapper, name: string) {
      const card = wrapper
        .findAll('[data-slot="items-cards"] > div')
        .find((candidate) => candidate.text().includes(name))!
      await card.find('button[aria-label="Mais ações"]').trigger('click')
      await settle()
    }

    it('opens the actions of a user in a sheet naming the person', async () => {
      const { wrapper, router } = await render()

      await openSheet(wrapper, 'Bruno')

      expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain(
        'bruno@example.com',
      )
      sheetButton('Editar').click()
      await settle()

      expect(router.currentRoute.value.params.id).toBe('u-2')
      expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    })

    it('opens the password dialog and the removal from the sheet', async () => {
      const { wrapper } = await render()

      await openSheet(wrapper, 'Bruno')
      sheetButton('Redefinir senha').click()
      await settle()
      expect(document.body.textContent).toContain('Redefinir a senha de Bruno?')

      document.body
        .querySelector('[role="dialog"]')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await settle()
      await openSheet(wrapper, 'Bruno')
      sheetButton('Remover').click()
      await settle()

      expect(useConfirmDialog().state.options.title).toBe('Remover o usuário “Bruno”?')
      useConfirmDialog().cancel()
    })

    it('disables the actions of the own account in the sheet', async () => {
      const { wrapper } = await render()

      await openSheet(wrapper, 'Admin Silva')

      expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain('Sua conta')
      for (const label of ['Editar', 'Redefinir senha', 'Remover']) {
        expect(sheetButton(label).disabled).toBe(true)
      }
    })
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
      await chooseRowAction(wrapper, 1, 'Redefinir senha')
      await settle()
      return wrapper
    }

    it('opens a dialog naming the user, closed until asked for', async () => {
      const { wrapper } = await render()
      expect(document.body.querySelector('form')).toBeNull()

      await chooseRowAction(wrapper, 1, 'Redefinir senha')
      await settle()

      expect(document.body.textContent).toContain('Redefinir a senha de Bruno?')
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
      expect(toast.success).toHaveBeenCalledWith('Senha redefinida', {
        description: 'A nova senha de “Bruno” já vale.',
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

      await chooseRowAction(wrapper, 1, 'Redefinir senha')
      await settle()

      expect(field('password').value).toBe('')
      expect(document.body.querySelector('[data-slot="server-error"]')).toBeNull()
    })
  })
})
