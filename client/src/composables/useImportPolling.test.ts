import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { importsApi } from '@/api/imports'
import { IMPORT_POLLING_INTERVAL, useImportPolling } from '@/composables/useImportPolling'
import { problem } from '@/test/crud'
import { createTestPlugins } from '@/test/mounting'
import type { ImportStatus, ImportView } from '@/types'

vi.mock('@/api/imports')

function importWith(status: ImportStatus) {
  return { id: 'i-1', status } as ImportView
}

function mountPolling() {
  const Host = defineComponent({
    setup() {
      return useImportPolling(() => 'i-1')
    },
    render: () => h('div'),
  })
  return mount(Host, { global: { plugins: createTestPlugins({ stubActions: false }).plugins } })
}

describe('useImportPolling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('asks again while the import is processing and stops when it is not', async () => {
    vi.mocked(importsApi.findById)
      .mockResolvedValueOnce(importWith('PROCESSING'))
      .mockResolvedValueOnce(importWith('PROCESSING'))
      .mockResolvedValueOnce(importWith('READY'))

    mountPolling()
    await flushPromises()

    expect(importsApi.findById).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(IMPORT_POLLING_INTERVAL)
    await vi.advanceTimersByTimeAsync(IMPORT_POLLING_INTERVAL)
    await vi.advanceTimersByTimeAsync(IMPORT_POLLING_INTERVAL * 3)

    expect(importsApi.findById).toHaveBeenCalledTimes(3)
    expect(importsApi.findById).toHaveBeenCalledWith('i-1', false)
  })

  it('stops asking when the screen is left', async () => {
    vi.mocked(importsApi.findById).mockResolvedValue(importWith('PROCESSING'))

    const wrapper = mountPolling()
    await flushPromises()
    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(IMPORT_POLLING_INTERVAL * 3)

    expect(importsApi.findById).toHaveBeenCalledTimes(1)
  })

  it('shows the error and stops asking when the call fails', async () => {
    vi.mocked(importsApi.findById).mockRejectedValue(problem(500))

    const wrapper = mountPolling()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(IMPORT_POLLING_INTERVAL * 3)

    expect(importsApi.findById).toHaveBeenCalledTimes(1)
    expect((wrapper.vm as unknown as { messages: string[] }).messages).toHaveLength(1)
  })
})
