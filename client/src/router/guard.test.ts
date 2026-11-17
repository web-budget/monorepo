import { createTestingPinia } from '@pinia/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import router from '@/router'
import { authGuard } from '@/router/guard'
import { useAuthStore } from '@/stores/auth'

function runGuard(path: string) {
  return authGuard(
    router.resolve(path) as unknown as RouteLocationNormalized,
    router.currentRoute.value,
    () => undefined,
  )
}

describe('authGuard', () => {
  let auth: ReturnType<typeof useAuthStore>

  beforeEach(() => {
    createTestingPinia({ createSpy: vi.fn })
    auth = useAuthStore()
  })

  it('lets a public route through without asking for the session', async () => {
    expect(await runGuard('/login')).toBe(true)
    expect(auth.restoreSession).not.toHaveBeenCalled()
  })

  it('lets an authenticated user through without asking again', async () => {
    auth.session = { name: 'Ana', email: 'ana@example.com', status: 'APPROVED', roles: [] }

    expect(await runGuard('/registration')).toBe(true)
    expect(auth.restoreSession).not.toHaveBeenCalled()
  })

  it('restores the session once and lets the user through when it is alive', async () => {
    vi.mocked(auth.restoreSession).mockResolvedValue(true)

    expect(await runGuard('/financial')).toBe(true)
    expect(auth.restoreSession).toHaveBeenCalledTimes(1)
  })

  it('sends a user with no session to the login with the requested path', async () => {
    vi.mocked(auth.restoreSession).mockResolvedValue(false)

    expect(await runGuard('/registration?tab=1')).toEqual({
      name: 'login',
      query: { redirect: '/registration?tab=1' },
    })
  })
})
