import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { rolesApi } from '@/api/roles'
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
vi.mock('@/api/roles')
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
    status: 'APPROVED',
    totpEnabled: true,
  },
  {
    id: 'u-2',
    active: false,
    name: 'Bruno',
    email: 'bruno@example.com',
    defaultLanguage: 'EN_US',
    authorities: ['FINANCIAL'],
    status: 'PENDING',
    totpEnabled: false,
  },
]

const USER_COUNTS = { APPROVED: 1, PENDING: 1, BLOCKED: 0, ALL: 2 }

const session = { name: 'Admin Silva', email: 'admin@example.com', status: 'APPROVED', roles: [] }

async function render(content = users, location?: string) {
  serveListing(vi.mocked(usersApi.findAll), content, content.length, USER_COUNTS)
  return mountView(UserListView, 'users', {}, { auth: { session } }, location)
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

function approveDialogButton(label: string) {
  return [...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(
    (candidate) => candidate.textContent?.trim() === label,
  )!
}
function approveDialogError() {
  return (
    document.body.querySelector('[role="dialog"] [data-slot="server-error"]')?.textContent ?? ''
  )
}

describe('UserListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(rolesApi.findAll).mockResolvedValue([
      'ADMINISTRATION',
      'DASHBOARDS',
      'FINANCIAL',
      'REGISTRATION',
    ])
    document.body.replaceChildren()
  })

  it('labels the button that leads to the creation form with just "Criar"', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('[data-slot="page-actions"]').text()).toBe('Criar')
  })

  it('lists the approved users on mount, with avatar, e-mail, areas and status', async () => {
    const { wrapper } = await render()

    expect(listingCalls(vi.mocked(usersApi.findAll))[0]).toEqual({
      filter: '',
      status: 'APPROVED',
      page: 0,
      size: 15,
      sort: 'createdOn,desc',
    })
    const bruno = rowOf(wrapper, 'Bruno')
    expect(bruno.text()).toContain('BR')
    expect(bruno.text()).toContain('bruno@example.com')
    expect(bruno.text()).toContain('Financeiro')
    expect(bruno.text()).toContain('Pendente')
    const admin = rowOf(wrapper, 'Admin Silva')
    expect(admin.text()).toContain('AS')
    expect(admin.findAll('td')[1]!.text()).toBe('CadastrosConfigurações')
    expect(admin.text()).toContain('Aprovado')
    expect(admin.findAll('td')[3]!.text()).toBe('Ativo')
    expect(bruno.findAll('td')[3]!.text()).toBe('—')
  })

  it('counts the users of each status on the tabs, starting on the approved ones', async () => {
    const { wrapper } = await render()

    expect(buttonWithText(wrapper, 'Aprovados').attributes('aria-pressed')).toBe('true')
    expect(buttonWithText(wrapper, 'Aprovados').text()).toBe('Aprovados 1')
    expect(buttonWithText(wrapper, 'Pendentes').text()).toBe('Pendentes 1')
    expect(buttonWithText(wrapper, 'Bloqueados').text()).toBe('Bloqueados 0')
    expect(buttonWithText(wrapper, 'Todos').text()).toBe('Todos 2')
  })

  describe('the status tab in the URL', () => {
    it.each([
      ['PENDING', 'Pendentes'],
      ['APPROVED', 'Aprovados'],
      ['BLOCKED', 'Bloqueados'],
      ['ALL', 'Todos'],
    ])('opens the tab of ?status=%s', async (status, tab) => {
      const { wrapper } = await render(users, `/users?status=${status}`)

      expect(buttonWithText(wrapper, tab).attributes('aria-pressed')).toBe('true')
      expect(listingCalls(vi.mocked(usersApi.findAll))[0]!.status).toBe(status)
    })

    it('opens the approved tab when the status is unknown', async () => {
      const { wrapper } = await render(users, '/users?status=NOPE')

      expect(buttonWithText(wrapper, 'Aprovados').attributes('aria-pressed')).toBe('true')
      expect(listingCalls(vi.mocked(usersApi.findAll))[0]!.status).toBe('APPROVED')
    })

    it('opens the approved tab without the parameter and leaves the URL alone', async () => {
      const { wrapper, router } = await render()

      expect(buttonWithText(wrapper, 'Aprovados').attributes('aria-pressed')).toBe('true')
      expect(router.currentRoute.value.query).toEqual({})
    })

    it('follows the tab in the URL, replacing the entry instead of piling up history', async () => {
      const { wrapper, router } = await render()
      const replace = vi.spyOn(router, 'replace')
      const push = vi.spyOn(router, 'push')

      await buttonWithText(wrapper, 'Bloqueados').trigger('click')
      await settle()
      expect(router.currentRoute.value.query.status).toBe('BLOCKED')

      await buttonWithText(wrapper, 'Todos').trigger('click')
      await settle()
      expect(router.currentRoute.value.query.status).toBe('ALL')
      expect(replace).toHaveBeenCalledTimes(2)
      expect(push).not.toHaveBeenCalled()
    })

    it('keeps the other parameters of the URL when the tab changes', async () => {
      const { wrapper, router } = await render(users, '/users?from=email')

      await buttonWithText(wrapper, 'Pendentes').trigger('click')
      await settle()

      expect(router.currentRoute.value.query).toEqual({ from: 'email', status: 'PENDING' })
    })

    it('follows the URL when it changes while the list is open', async () => {
      const { wrapper, router } = await render(users, '/users')

      await router.push('/users?status=PENDING')
      await settle()

      expect(buttonWithText(wrapper, 'Pendentes').attributes('aria-pressed')).toBe('true')
      expect(lastListingCall()!.status).toBe('PENDING')
    })

    it('ignores an unknown status that arrives while the list is open', async () => {
      const { wrapper, router } = await render(users, '/users')

      await router.push('/users?status=NOPE')
      await settle()

      expect(buttonWithText(wrapper, 'Aprovados').attributes('aria-pressed')).toBe('true')
    })

    it('opens with the search, page, size and sort of the URL, which stay there', async () => {
      const location = '/users?filter=bru&status=BLOCKED&page=2&size=30&sort=name,asc'

      const { wrapper, router } = await render(users, location)

      expect(listingCalls(vi.mocked(usersApi.findAll))[0]).toEqual({
        filter: 'bru',
        status: 'BLOCKED',
        page: 1,
        size: 30,
        sort: 'name,asc',
      })
      expect((wrapper.find('input').element as HTMLInputElement).value).toBe('bru')
      expect(router.currentRoute.value.fullPath).toBe(location)
    })

    it('writes the search, the page and the sort to the URL', async () => {
      const { wrapper, router } = await render()

      await wrapper.find('input').setValue('bru')
      await wrapper.find('input').trigger('keydown', { key: 'Enter' })
      await settle()
      await buttonWithText(wrapper, 'Nome').trigger('click')
      await settle()

      expect(router.currentRoute.value.query).toEqual({ filter: 'bru', sort: 'name,asc' })
    })

    it('puts the pending tab in the URL from the pending notice', async () => {
      const { wrapper, router } = await render()

      await buttonWithText(wrapper, 'Ver pendentes').trigger('click')
      await settle()

      expect(router.currentRoute.value.query.status).toBe('PENDING')
    })
  })

  it('searches by the typed text and by status, and clears the text without touching the status', async () => {
    const { wrapper } = await render()

    await wrapper.find('input').setValue('bru')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(lastListingCall()).toMatchObject({ filter: 'bru' })

    await buttonWithText(wrapper, 'Pendentes').trigger('click')
    await flushPromises()
    expect(lastListingCall()).toMatchObject({ status: 'PENDING' })

    await wrapper.find('button[aria-label="Limpar filtro"]').trigger('click')
    await flushPromises()
    expect(lastListingCall()).toMatchObject({
      filter: '',
      status: 'PENDING',
    })
  })

  it('sorts by name in both directions, with the name and e-mail cell, and goes back to the newest first', async () => {
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Nome').trigger('click')
    await flushPromises()
    expect(lastListingCall()).toEqual(expect.objectContaining({ sort: 'name,asc' }))

    await buttonWithText(wrapper, 'Nome').trigger('click')
    await flushPromises()
    expect(lastListingCall()).toEqual(expect.objectContaining({ sort: 'name,desc' }))

    await buttonWithText(wrapper, 'Nome').trigger('click')
    await flushPromises()
    expect(lastListingCall()).toEqual(expect.objectContaining({ sort: 'createdOn,desc' }))
  })

  it('opens the forms to create and to edit a user', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Criar').trigger('click')
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
      for (const label of ['Editar', 'Redefinir senha', 'Excluir']) {
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
      for (const label of ['Editar', 'Redefinir senha', 'Excluir']) {
        expect(menuItem(label).getAttribute('data-disabled')).toBeNull()
      }
    })
  })

  it('deletes a user only after confirming, naming the user in the question', async () => {
    const { wrapper } = await render()
    vi.mocked(usersApi.remove).mockResolvedValue(undefined)

    const dialog = useConfirmDialog()
    await chooseRowAction(wrapper, 1, 'Excluir')

    expect(dialog.state.open).toBe(true)
    expect(dialog.state.options.title).toBe('Excluir o usuário “Bruno”?')
    expect(usersApi.remove).not.toHaveBeenCalled()

    dialog.accept()
    await flushPromises()

    expect(usersApi.remove).toHaveBeenCalledWith('u-2')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(toast.success).toHaveBeenCalledWith('Usuário excluído', {
      description: '“Bruno” saiu da lista.',
      duration: 4000,
    })
  })

  it('keeps the user when the deletion is not confirmed', async () => {
    const { wrapper } = await render()

    await chooseRowAction(wrapper, 1, 'Excluir')
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
    serveListing(vi.mocked(usersApi.findAll), [], 0, {
      APPROVED: 0,
      PENDING: 0,
      BLOCKED: 0,
      ALL: 0,
    })
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

  describe('the approval of new accounts', () => {
    it('marks the pending accounts with the highlighter, and nobody else', async () => {
      const { wrapper } = await render()

      expect(rowOf(wrapper, 'Bruno').attributes('data-state')).toBe('selected')
      expect(rowOf(wrapper, 'Admin Silva').attributes('data-state')).toBeUndefined()
    })

    it('warns about the accounts waiting for approval and jumps to them', async () => {
      const { wrapper } = await render()

      const notice = wrapper.find('[data-slot="pending-notice"]')
      expect(notice.text()).toContain('1 conta aguardando aprovação')

      await buttonWithText(wrapper, 'Ver pendentes').trigger('click')
      await flushPromises()

      expect(lastListingCall()).toMatchObject({ status: 'PENDING' })
      expect(wrapper.find('[data-slot="pending-notice"]').exists()).toBe(false)
    })

    it('says how many accounts wait when there are several', async () => {
      serveListing(vi.mocked(usersApi.findAll), users, 2, { ...USER_COUNTS, PENDING: 3 })
      const { wrapper } = await mountView(UserListView, 'users', {}, { auth: { session } })

      expect(wrapper.find('[data-slot="pending-notice"]').text()).toContain(
        '3 contas aguardando aprovação',
      )
    })

    it('does not warn when nobody is waiting', async () => {
      serveListing(vi.mocked(usersApi.findAll), users, 2, { ...USER_COUNTS, PENDING: 0 })
      const { wrapper } = await mountView(UserListView, 'users', {}, { auth: { session } })

      expect(wrapper.find('[data-slot="pending-notice"]').exists()).toBe(false)
    })

    it('approves a pending account choosing the areas, and reloads the list', async () => {
      const { wrapper } = await render()
      vi.mocked(usersApi.approve).mockResolvedValue()

      await rowOf(wrapper, 'Bruno').find('[data-slot="approve-shortcut"]').trigger('click')
      await settle()
      expect(document.body.textContent).toContain('Aprovar a conta de Bruno?')

      ;(document.body.querySelector('#roles-DASHBOARDS') as HTMLElement).click()
      await settle()
      approveDialogButton('Aprovar').click()
      await settle()

      expect(usersApi.approve).toHaveBeenCalledExactlyOnceWith('u-2', ['FINANCIAL', 'DASHBOARDS'])
      expect(usersApi.update).not.toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('Conta aprovada', {
        description: 'Bruno já pode entrar.',
        duration: 4000,
      })
      expect(document.body.textContent).not.toContain('Aprovar a conta de Bruno?')
    })

    it('tells the user when the server refuses the areas, and leaves the list as it was', async () => {
      const { wrapper } = await render()
      vi.mocked(usersApi.approve).mockRejectedValue(
        problem(400, { error: 'field-validation-failed' }),
      )

      await chooseRowAction(wrapper, 1, 'Aprovar')
      await settle()
      approveDialogButton('Aprovar').click()
      await settle()

      expect(approveDialogError()).toContain('Alguma informação está ausente ou inválida')
      expect(wrapper.text()).not.toContain('Alguma informação está ausente ou inválida')
      expect(document.body.textContent).toContain('Aprovar a conta de Bruno?')
      expect(usersApi.update).not.toHaveBeenCalled()
      expect(toast.success).not.toHaveBeenCalled()
    })

    it('closes the approval dialog with Escape', async () => {
      const { wrapper } = await render()

      await chooseRowAction(wrapper, 1, 'Aprovar')
      await settle()
      document.body
        .querySelector('[role="dialog"]')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await settle()

      expect(document.body.textContent).not.toContain('Aprovar a conta de Bruno?')
    })

    it('says nobody is waiting on an empty pending tab, instead of the generic no result', async () => {
      const { wrapper } = await render()
      serveListing(vi.mocked(usersApi.findAll), [], 0, { ...USER_COUNTS, PENDING: 0 })

      await buttonWithText(wrapper, 'Pendentes').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-state="no-pending"]').text()).toContain(
        'Nenhuma conta aguardando aprovação',
      )
      expect(stateOf(wrapper)).toBeUndefined()
    })

    it('keeps the generic no result for a search on the pending tab', async () => {
      const { wrapper } = await render()
      serveListing(vi.mocked(usersApi.findAll), [], 0, { ...USER_COUNTS, PENDING: 0 })

      await buttonWithText(wrapper, 'Pendentes').trigger('click')
      await flushPromises()
      await wrapper.find('input').setValue('zzz')
      await wrapper.find('input').trigger('keydown', { key: 'Enter' })
      await flushPromises()

      expect(wrapper.find('[data-state="no-pending"]').exists()).toBe(false)
      expect(stateOf(wrapper)).toBe('no-result')
    })

    it('says an account has no area yet, instead of leaving the cell blank', async () => {
      const { wrapper } = await render([{ ...users[1]!, authorities: [] }])

      expect(rowOf(wrapper, 'Bruno').findAll('td')[1]!.text()).toBe('Nenhuma ainda')
    })

    it('keeps working when the roles to grant cannot be loaded', async () => {
      vi.mocked(rolesApi.findAll).mockRejectedValue(problem(500))

      const { wrapper } = await render()

      expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    })

    it('does not approve without an area to grant', async () => {
      const { wrapper } = await render()

      await rowOf(wrapper, 'Bruno').find('[data-slot="approve-shortcut"]').trigger('click')
      await settle()
      ;(document.body.querySelector('#roles-FINANCIAL') as HTMLElement).click()
      await settle()
      approveDialogButton('Aprovar').click()
      await settle()

      expect(document.body.textContent).toContain('Escolha pelo menos uma área.')
      expect(usersApi.approve).not.toHaveBeenCalled()
    })

    it('does not take the focus from the roles when the cancel button is pressed', async () => {
      const { wrapper } = await render()
      await chooseRowAction(wrapper, 1, 'Aprovar')
      await settle()
      const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true })

      approveDialogButton('Cancelar').dispatchEvent(press)

      expect(press.defaultPrevented).toBe(true)
    })

    it('closes the approval dialog without approving', async () => {
      const { wrapper } = await render()

      await chooseRowAction(wrapper, 1, 'Aprovar')
      await settle()
      approveDialogButton('Cancelar').click()
      await settle()

      expect(document.body.textContent).not.toContain('Aprovar a conta de Bruno?')
      expect(usersApi.approve).not.toHaveBeenCalled()
    })

    it('tells the user when the account changed status meanwhile', async () => {
      const { wrapper } = await render()
      vi.mocked(usersApi.approve).mockRejectedValue(
        problem(409, { error: 'invalid-user-status-transition' }),
      )

      await chooseRowAction(wrapper, 1, 'Aprovar')
      await settle()
      approveDialogButton('Aprovar').click()
      await settle()

      expect(approveDialogError()).toContain(
        'A conta mudou de status enquanto a tela estava aberta',
      )
      expect(wrapper.text()).not.toContain('A conta mudou de status enquanto a tela estava aberta')
    })
  })

  describe('blocking, unblocking and resetting the TOTP', () => {
    const approved: UserView = { ...users[1]!, status: 'APPROVED', totpEnabled: true }
    const blocked: UserView = { ...users[1]!, status: 'BLOCKED', totpEnabled: false }

    it.each([
      ['approved with TOTP', approved, ['Bloquear', 'Resetar TOTP'], ['Aprovar', 'Desbloquear']],
      ['blocked', blocked, ['Desbloquear'], ['Aprovar', 'Bloquear', 'Resetar TOTP']],
      ['pending', users[1]!, ['Aprovar'], ['Bloquear', 'Desbloquear', 'Resetar TOTP']],
    ])('offers the right actions to an account that is %s', async (_, user, present, absent) => {
      const { wrapper } = await render([user])

      await wrapper.find('button[aria-label="Mais ações"]').trigger('keydown', { key: 'Enter' })
      await flushPromises()

      const labels = [...document.body.querySelectorAll('[role="menuitem"]')].map((item) =>
        item.textContent?.trim(),
      )
      expect(labels).toEqual(expect.arrayContaining(present))
      for (const label of absent) {
        expect(labels).not.toContain(label)
      }
    })

    it('blocks an account only after confirming, and reloads the list', async () => {
      const { wrapper } = await render([approved])
      vi.mocked(usersApi.block).mockResolvedValue()
      const dialog = useConfirmDialog()

      await chooseRowAction(wrapper, 0, 'Bloquear')

      expect(dialog.state.options.title).toBe('Bloquear Bruno?')
      expect(usersApi.block).not.toHaveBeenCalled()
      dialog.accept()
      await settle()

      expect(usersApi.block).toHaveBeenCalledWith('u-2')
      expect(toast.success).toHaveBeenCalledWith('Conta bloqueada', {
        description: 'Bruno não consegue mais entrar.',
        duration: 4000,
      })
    })

    it('unblocks an account only after confirming', async () => {
      const { wrapper } = await render([blocked])
      vi.mocked(usersApi.unblock).mockResolvedValue()
      const dialog = useConfirmDialog()

      await chooseRowAction(wrapper, 0, 'Desbloquear')
      expect(dialog.state.options.title).toBe('Desbloquear Bruno?')
      dialog.accept()
      await settle()

      expect(usersApi.unblock).toHaveBeenCalledWith('u-2')
      expect(toast.success).toHaveBeenCalledWith('Conta desbloqueada', {
        description: 'Bruno volta a entrar.',
        duration: 4000,
      })
    })

    it('resets the TOTP only after confirming', async () => {
      const { wrapper } = await render([approved])
      vi.mocked(usersApi.resetTotp).mockResolvedValue()
      const dialog = useConfirmDialog()

      await chooseRowAction(wrapper, 0, 'Resetar TOTP')
      expect(dialog.state.options.title).toBe('Resetar o TOTP de Bruno?')
      dialog.accept()
      await settle()

      expect(usersApi.resetTotp).toHaveBeenCalledWith('u-2')
      expect(toast.success).toHaveBeenCalledWith('TOTP resetado', {
        description: 'Bruno cadastra o autenticador de novo no próximo login.',
        duration: 4000,
      })
    })

    it.each(['Bloquear', 'Desbloquear', 'Resetar TOTP'])(
      'does nothing when %s is not confirmed',
      async (label) => {
        const user = label === 'Desbloquear' ? blocked : approved
        const { wrapper } = await render([user])

        await chooseRowAction(wrapper, 0, label)
        useConfirmDialog().cancel()
        await settle()

        expect(usersApi.block).not.toHaveBeenCalled()
        expect(usersApi.unblock).not.toHaveBeenCalled()
        expect(usersApi.resetTotp).not.toHaveBeenCalled()
      },
    )

    it('shows the server error above the table when the action fails', async () => {
      const { wrapper } = await render([approved])
      vi.mocked(usersApi.block).mockRejectedValue(
        problem(409, { error: 'invalid-user-status-transition' }),
      )

      await chooseRowAction(wrapper, 0, 'Bloquear')
      useConfirmDialog().accept()
      await settle()

      expect(wrapper.text()).toContain('A conta mudou de status enquanto a tela estava aberta')
      expect(toast.success).not.toHaveBeenCalled()
    })

    it('keeps the own account out of reach of the new actions', async () => {
      const { wrapper } = await render([{ ...users[0]!, totpEnabled: true }])

      await wrapper.find('button[aria-label="Mais ações"]').trigger('keydown', { key: 'Enter' })
      await flushPromises()

      for (const label of ['Bloquear', 'Resetar TOTP']) {
        expect(menuItem(label).getAttribute('data-disabled')).not.toBeNull()
      }
    })
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
      sheetButton('Excluir').click()
      await settle()

      expect(useConfirmDialog().state.options.title).toBe('Excluir o usuário “Bruno”?')
      useConfirmDialog().cancel()
    })

    it.each([
      ['approve', 'Aprovar', 'Aprovar a conta de Bruno?', 'PENDING', false],
      ['block', 'Bloquear', 'Bloquear Bruno?', 'APPROVED', false],
      ['unblock', 'Desbloquear', 'Desbloquear Bruno?', 'BLOCKED', false],
      ['reset the TOTP of', 'Resetar TOTP', 'Resetar o TOTP de Bruno?', 'APPROVED', true],
    ] as const)(
      'lets the user %s an account from the sheet',
      async (_, label, title, status, totp) => {
        const { wrapper } = await render([{ ...users[1]!, status, totpEnabled: totp }])

        await openSheet(wrapper, 'Bruno')
        sheetButton(label).click()
        await settle()

        const asked =
          label === 'Aprovar' ? document.body.textContent : useConfirmDialog().state.options.title
        expect(asked).toContain(title)
        useConfirmDialog().cancel()
      },
    )

    it('hides the actions that do not fit the status in the sheet', async () => {
      const { wrapper } = await render([{ ...users[1]!, status: 'PENDING', totpEnabled: false }])

      await openSheet(wrapper, 'Bruno')

      for (const label of ['Bloquear', 'Desbloquear', 'Resetar TOTP']) {
        expect(sheetButton(label)).toBeUndefined()
      }
    })

    it('disables the actions of the own account in the sheet', async () => {
      const { wrapper } = await render()

      await openSheet(wrapper, 'Admin Silva')

      expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain('Sua conta')
      for (const label of ['Editar', 'Redefinir senha', 'Excluir']) {
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
      document.body
        .querySelector('[role="dialog"] form')!
        .dispatchEvent(new Event('submit', { cancelable: true }))
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
      expect(document.body.querySelector('[role="dialog"] form')).toBeNull()

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
      expect(document.body.querySelector('[role="dialog"] form')).toBeNull()
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

      expect(document.body.querySelector('[role="dialog"] form')).toBeNull()
    })

    it('does not take the focus from the field when the cancel button is pressed', async () => {
      await open()
      const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true })

      const cancel = [...document.body.querySelectorAll('button')].find(
        (button) => button.textContent?.trim() === 'Cancelar',
      )!
      cancel.dispatchEvent(press)

      expect(press.defaultPrevented).toBe(true)
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
      expect(document.body.querySelector('[role="dialog"] form')).toBeNull()

      await chooseRowAction(wrapper, 1, 'Redefinir senha')
      await settle()

      expect(field('password').value).toBe('')
      expect(document.body.querySelector('[data-slot="server-error"]')).toBeNull()
    })
  })
})
