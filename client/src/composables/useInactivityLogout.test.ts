import { createTestingPinia } from '@pinia/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { recordServerActivity } from '@/api/serverActivity'
import {
  SESSION_IDLE_TIMEOUT_MINUTES,
  useInactivityLogout,
} from '@/composables/useInactivityLogout'
import { useAuthStore } from '@/stores/auth'

const MINUTE = 60 * 1000

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useInactivityLogout', () => {
  let auth: ReturnType<typeof useAuthStore>
  let scope = effectScope()

  function start() {
    scope = effectScope()
    scope.run(() => useInactivityLogout())
  }

  beforeEach(() => {
    vi.useFakeTimers()
    createTestingPinia({ createSpy: vi.fn })
    auth = useAuthStore()
    recordServerActivity()
  })

  afterEach(() => {
    scope.stop()
    setVisibility('visible')
    vi.useRealTimers()
  })

  it('waits as long as the server session does', () => {
    expect(SESSION_IDLE_TIMEOUT_MINUTES).toBe(30)
  })

  it('does not watch anything without a session', () => {
    start()

    vi.advanceTimersByTime(60 * MINUTE)

    expect(auth.expireSession).not.toHaveBeenCalled()
  })

  it('ends the session as the idle time reaches the timeout', () => {
    auth.session = {
      name: 'Ana',
      email: 'ana@example.com',
      status: 'APPROVED',
      language: 'PT_BR',
      hasPassword: true,
      googleLinked: false,
      totpEnabled: false,
      roles: [],
    }
    start()

    vi.advanceTimersByTime(29 * MINUTE)
    expect(auth.expireSession).not.toHaveBeenCalled()

    vi.advanceTimersByTime(MINUTE)
    expect(auth.expireSession).toHaveBeenCalledWith('inactivity')
  })

  it('keeps the session while the server keeps answering', () => {
    auth.session = {
      name: 'Ana',
      email: 'ana@example.com',
      status: 'APPROVED',
      language: 'PT_BR',
      hasPassword: true,
      googleLinked: false,
      totpEnabled: false,
      roles: [],
    }
    start()

    vi.advanceTimersByTime(25 * MINUTE)
    recordServerActivity()
    vi.advanceTimersByTime(25 * MINUTE)

    expect(auth.expireSession).not.toHaveBeenCalled()
  })

  it('checks again when the tab becomes visible, and not when it is hidden', () => {
    auth.session = {
      name: 'Ana',
      email: 'ana@example.com',
      status: 'APPROVED',
      language: 'PT_BR',
      hasPassword: true,
      googleLinked: false,
      totpEnabled: false,
      roles: [],
    }
    start()
    vi.setSystemTime(Date.now() + 31 * MINUTE)

    setVisibility('hidden')
    expect(auth.expireSession).not.toHaveBeenCalled()

    setVisibility('visible')
    expect(auth.expireSession).toHaveBeenCalledWith('inactivity')
  })

  it('starts watching when a session begins and stops when it ends', async () => {
    start()
    auth.session = {
      name: 'Ana',
      email: 'ana@example.com',
      status: 'APPROVED',
      language: 'PT_BR',
      hasPassword: true,
      googleLinked: false,
      totpEnabled: false,
      roles: [],
    }
    await nextTick()
    auth.session = {
      name: 'Ana',
      email: 'ana@example.com',
      status: 'APPROVED',
      language: 'PT_BR',
      hasPassword: true,
      googleLinked: false,
      totpEnabled: false,
      roles: ['FINANCIAL'],
    }
    await nextTick()

    vi.advanceTimersByTime(31 * MINUTE)
    expect(auth.expireSession).toHaveBeenCalled()
    vi.mocked(auth.expireSession).mockClear()

    auth.session = null
    await nextTick()
    vi.advanceTimersByTime(60 * MINUTE)
    setVisibility('visible')

    expect(auth.expireSession).not.toHaveBeenCalled()
  })

  it('stops watching with its scope', () => {
    auth.session = {
      name: 'Ana',
      email: 'ana@example.com',
      status: 'APPROVED',
      language: 'PT_BR',
      hasPassword: true,
      googleLinked: false,
      totpEnabled: false,
      roles: [],
    }
    start()

    scope.stop()
    vi.advanceTimersByTime(60 * MINUTE)

    expect(auth.expireSession).not.toHaveBeenCalled()
  })
})
