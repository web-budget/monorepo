import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { useCrudDetail } from '@/composables/useCrudDetail'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { createTestPlugins } from '@/test/mounting'

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

describe('useCrudDetail', () => {
  it('asks to remove a record that has no name yet without breaking the question', async () => {
    const remove = vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined)
    const { plugins } = createTestPlugins({
      routes: [{ path: '/wallets', name: 'wallets', component: { render: () => h('div') } }],
    })
    let removeRecord: () => Promise<void> = () => Promise.resolve()
    const Host = defineComponent({
      setup() {
        removeRecord = useCrudDetail({
          routeName: 'wallets',
          entity: 'wallet',
          id: () => 'w-1',
          name: () => undefined,
          findOne: () => Promise.resolve(undefined),
          remove,
        }).remove
        return () => h('div')
      },
    })
    mount(Host, { global: { plugins } })
    await flushPromises()
    const dialog = useConfirmDialog()

    const removal = removeRecord()
    expect(dialog.state.options.title).toBe('Remover a carteira “”?')
    dialog.accept()
    await removal

    expect(remove).toHaveBeenCalledWith('w-1')
  })
})
