import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { useModuleCounts } from '@/composables/useModuleCounts'

function mountWith(sources: Record<string, () => Promise<number | null>>) {
  let counts: ReturnType<typeof useModuleCounts>['counts']
  mount(
    defineComponent({
      setup() {
        counts = useModuleCounts(sources).counts
        return () => h('div')
      },
    }),
  )
  return () => counts.value
}

describe('useModuleCounts', () => {
  it('starts empty and fills each destination as its count arrives', async () => {
    let resolveSlow: (total: number) => void = () => undefined
    const slow = new Promise<number>((resolve) => {
      resolveSlow = resolve
    })
    const read = mountWith({ '/a': () => slow, '/b': () => Promise.resolve(3) })

    expect(read()).toEqual({})

    await flushPromises()
    expect(read()).toEqual({ '/b': 3 })

    resolveSlow(7)
    await flushPromises()
    expect(read()).toEqual({ '/a': 7, '/b': 3 })
  })

  it('keeps a null count for the destination whose call failed', async () => {
    const read = mountWith({ '/a': () => Promise.resolve(null), '/b': () => Promise.resolve(0) })

    await flushPromises()

    expect(read()).toEqual({ '/a': null, '/b': 0 })
  })

  it('asks every source once, on mount', async () => {
    const source = vi.fn<() => Promise<number>>(() => Promise.resolve(1))

    mountWith({ '/a': source })
    await flushPromises()

    expect(source).toHaveBeenCalledTimes(1)
  })
})
