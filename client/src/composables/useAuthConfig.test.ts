import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { authApi } from '@/api/auth'
import { useAuthConfig } from '@/composables/useAuthConfig'

vi.mock('@/api/auth', () => ({ authApi: { fetchConfig: vi.fn<() => Promise<unknown>>() } }))

const Host = defineComponent({
  setup() {
    const { googleAuthEnabled } = useAuthConfig()
    return () => h('span', String(googleAuthEnabled.value))
  },
})

async function enabledAfterLoading() {
  const wrapper = mount(Host)
  await flushPromises()
  return wrapper.text()
}

describe('useAuthConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts with Google off and turns it on when the server says so', async () => {
    vi.mocked(authApi.fetchConfig).mockResolvedValue({ googleAuthEnabled: true })

    expect(await enabledAfterLoading()).toBe('true')
  })

  it('keeps Google off when the server says so', async () => {
    vi.mocked(authApi.fetchConfig).mockResolvedValue({ googleAuthEnabled: false })

    expect(await enabledAfterLoading()).toBe('false')
  })

  it('keeps Google off when the config cannot be fetched', async () => {
    vi.mocked(authApi.fetchConfig).mockRejectedValue(new Error('offline'))

    expect(await enabledAfterLoading()).toBe('false')
  })
})
