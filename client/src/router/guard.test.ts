import { createTestingPinia } from '@pinia/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import router from '@/router'
import { authGuard } from '@/router/guard'
import { useAuthStore } from '@/stores/auth'
import type { Role, SessionResponse } from '@/types'

function runGuard(path: string) {
  return authGuard(
    router.resolve(path) as unknown as RouteLocationNormalized,
    router.currentRoute.value,
    () => undefined,
  )
}

function sessionWith(roles: Role[]): SessionResponse {
  return {
    name: 'Ana',
    email: 'ana@example.com',
    status: 'APPROVED',
    language: 'PT_BR',
    dueDateNotices: true,
    hasPassword: true,
    googleLinked: false,
    totpEnabled: false,
    totpRequired: false,
    roles,
  }
}

describe('authGuard', () => {
  let auth: ReturnType<typeof useAuthStore>

  beforeEach(() => {
    createTestingPinia({ createSpy: vi.fn })
    auth = useAuthStore()
    vi.mocked(auth.hasRole).mockImplementation(
      (role) => auth.session?.roles.includes(role) ?? false,
    )
  })

  it('lets a public route through without asking for the session', async () => {
    expect(await runGuard('/login')).toBe(true)
    expect(auth.restoreSession).not.toHaveBeenCalled()
  })

  it('lets an authenticated user through without asking again', async () => {
    auth.session = sessionWith(['REGISTRATION'])

    expect(await runGuard('/registration')).toBe(true)
    expect(auth.restoreSession).not.toHaveBeenCalled()
  })

  it('restores the session once and lets the user through when it is alive', async () => {
    vi.mocked(auth.restoreSession).mockImplementation(() => {
      auth.session = sessionWith(['FINANCIAL'])
      return Promise.resolve(true)
    })

    expect(await runGuard('/financial')).toBe(true)
    expect(auth.restoreSession).toHaveBeenCalledTimes(1)
  })

  it('keeps the query of the user list in the redirect of a user with no session', async () => {
    vi.mocked(auth.restoreSession).mockResolvedValue(false)

    expect(await runGuard('/configuration/users?status=PENDING')).toEqual({
      name: 'login',
      query: { redirect: '/configuration/users?status=PENDING' },
    })
  })

  it('sends a user with no session to the login with the requested path', async () => {
    vi.mocked(auth.restoreSession).mockResolvedValue(false)

    expect(await runGuard('/registration?tab=1')).toEqual({
      name: 'login',
      query: { redirect: '/registration?tab=1' },
    })
  })

  it.each([
    [['DASHBOARDS'], '/dashboards'],
    [['FINANCIAL', 'REGISTRATION'], '/financial'],
    [['REGISTRATION', 'ADMINISTRATION'], '/registration'],
    [['ADMINISTRATION'], '/configuration'],
  ] as [Role[], string][])(
    'sends the root to the first section the roles %j give access to',
    async (roles, expected) => {
      auth.session = sessionWith(roles)

      expect(await runGuard('/')).toBe(expected)
    },
  )

  it('sends a user without any area role from the root to the forbidden page', async () => {
    auth.session = sessionWith([])

    expect(await runGuard('/')).toEqual({ name: '403' })
  })

  it('restores the session before choosing the section of the root', async () => {
    vi.mocked(auth.restoreSession).mockImplementation(() => {
      auth.session = sessionWith(['REGISTRATION'])
      return Promise.resolve(true)
    })

    expect(await runGuard('/')).toBe('/registration')
    expect(auth.restoreSession).toHaveBeenCalledTimes(1)
  })

  it('sends a visitor without a session from the root to the login, keeping the root as the redirect', async () => {
    vi.mocked(auth.restoreSession).mockResolvedValue(false)

    expect(await runGuard('/')).toEqual({ name: 'login', query: { redirect: '/' } })
  })

  it.each([
    ['/registration', 'REGISTRATION'],
    ['/registration/wallets/create', 'REGISTRATION'],
    ['/financial', 'FINANCIAL'],
    ['/configuration', 'ADMINISTRATION'],
  ] as const)('lets %s through for a user with the %s role', async (path, role) => {
    auth.session = sessionWith([role])

    expect(await runGuard(path)).toBe(true)
  })

  it.each([
    ['/registration', 'FINANCIAL'],
    ['/registration/cards/abc/update', 'FINANCIAL'],
    ['/financial', 'REGISTRATION'],
    ['/configuration', 'REGISTRATION'],
  ] as const)(
    'sends a user without the role of %s (has only %s) to the forbidden page',
    async (path, role) => {
      auth.session = sessionWith([role])

      expect(await runGuard(path)).toEqual({ name: '403' })
    },
  )

  it.each(['PENDING', 'BLOCKED'] as const)(
    'sends an account that is %s to the approval screen, whatever it asks for',
    async (status) => {
      auth.session = { ...sessionWith(['REGISTRATION']), status }

      expect(await runGuard('/registration')).toEqual({ name: 'pending-approval' })
      expect(await runGuard('/')).toEqual({ name: 'pending-approval' })
    },
  )

  it('sends a restored pending account to the approval screen', async () => {
    vi.mocked(auth.restoreSession).mockImplementation(() => {
      auth.session = { ...sessionWith([]), status: 'PENDING' }
      return Promise.resolve(true)
    })

    expect(await runGuard('/')).toEqual({ name: 'pending-approval' })
  })

  it('lets the approval screen itself open without a session', async () => {
    expect(await runGuard('/pending-approval')).toBe(true)
    expect(auth.restoreSession).not.toHaveBeenCalled()
  })

  it('checks the role of a session it had to restore', async () => {
    vi.mocked(auth.restoreSession).mockImplementation(() => {
      auth.session = sessionWith(['FINANCIAL'])
      return Promise.resolve(true)
    })

    expect(await runGuard('/configuration')).toEqual({ name: '403' })
  })
})
