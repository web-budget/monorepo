import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { rolesApi } from '@/api/roles'
import { usersApi } from '@/api/users'
import type { UserView } from '@/types'
import { useUsersAdminStore } from './usersAdmin'

vi.mock('@/api/users')
vi.mock('@/api/roles')

const user: UserView = {
  id: 'u-1',
  active: false,
  name: 'Ana',
  email: 'ana@example.com',
  defaultLanguage: 'PT_BR',
  authorities: ['REGISTRATION'],
}
const page = { content: [user], page: { size: 15, number: 0, totalElements: 1, totalPages: 1 } }

describe('useUsersAdminStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('lists users of every status by default, so a user pending activation shows up', async () => {
    vi.mocked(usersApi.findAll).mockResolvedValue(page)
    const store = useUsersAdminStore()

    await store.findAll()

    expect(usersApi.findAll).toHaveBeenCalledWith({
      filter: '',
      status: 'ALL',
      page: 0,
      size: 15,
      sort: 'createdOn,asc',
    })
    expect(store.pageResponse.content).toEqual([user])
  })

  it('loads the roles that can be granted', async () => {
    vi.mocked(rolesApi.findAll).mockResolvedValue(['ADMINISTRATION', 'REGISTRATION'])
    const store = useUsersAdminStore()

    await store.findRoles()

    expect(store.roles).toEqual(['ADMINISTRATION', 'REGISTRATION'])
  })

  it('keeps the user being edited and drops it from the listing when removed', async () => {
    vi.mocked(usersApi.findAll).mockResolvedValue(page)
    vi.mocked(usersApi.findById).mockResolvedValue(user)
    vi.mocked(usersApi.update).mockResolvedValue({ ...user, active: true })
    vi.mocked(usersApi.remove).mockResolvedValue()
    const store = useUsersAdminStore()
    await store.findAll()

    await store.findOne('u-1')
    expect(store.user).toEqual(user)

    await store.update('u-1', {
      active: true,
      name: 'Ana',
      defaultLanguage: 'PT_BR',
      roles: ['REGISTRATION'],
    })
    expect(store.user?.active).toBe(true)

    await store.remove('u-1')
    expect(usersApi.remove).toHaveBeenCalledWith('u-1')
    expect(store.pageResponse.content).toEqual([])
    expect(store.user).toBeNull()
  })

  it('creates a user', async () => {
    vi.mocked(usersApi.create).mockResolvedValue('new-id')
    const store = useUsersAdminStore()
    const form = {
      name: 'Ana',
      email: 'ana@example.com',
      password: 'secret-123',
      defaultLanguage: 'PT_BR' as const,
      roles: ['REGISTRATION'],
      sendActivationEmail: true,
    }

    await store.create(form)

    expect(usersApi.create).toHaveBeenCalledWith(form)
  })

  it('changes the password of a user and reports the operation as loading meanwhile', async () => {
    let finish: () => void = () => undefined
    vi.mocked(usersApi.updatePassword).mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve
      }),
    )
    const store = useUsersAdminStore()

    const pending = store.updatePassword('u-1', { temporary: true, password: 'new-secret' })
    expect(store.loading).toBe(true)
    finish()
    await pending

    expect(usersApi.updatePassword).toHaveBeenCalledWith('u-1', {
      temporary: true,
      password: 'new-secret',
    })
    expect(store.loading).toBe(false)
  })

  it('reset() clears the listing, the filters, the roles and the current user', async () => {
    vi.mocked(usersApi.findAll).mockResolvedValue(page)
    vi.mocked(usersApi.findById).mockResolvedValue(user)
    vi.mocked(rolesApi.findAll).mockResolvedValue(['ADMINISTRATION'])
    const store = useUsersAdminStore()
    store.pageRequest.filterText = 'Ana'
    await store.findAll()
    await store.findOne('u-1')
    await store.findRoles()

    store.reset()

    expect(store.pageRequest.filterText).toBe('')
    expect(store.pageRequest.status).toBe('ALL')
    expect(store.pageResponse.content).toEqual([])
    expect(store.roles).toEqual([])
    expect(store.user).toBeNull()
  })
})
