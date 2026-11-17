import { afterEach, describe, expect, it } from 'vitest'
import { useConfirmDialog } from '@/composables/useConfirmDialog'

describe('useConfirmDialog', () => {
  afterEach(() => {
    useConfirmDialog().cancel()
  })

  it('opens the dialog with the given options and resolves true on accept', async () => {
    const dialog = useConfirmDialog()

    const result = dialog.confirm({ title: 'Sure?' })

    expect(dialog.state.open).toBe(true)
    expect(dialog.state.options.title).toBe('Sure?')

    dialog.accept()

    expect(await result).toBe(true)
    expect(dialog.state.open).toBe(false)
  })

  it('resolves false on cancel', async () => {
    const dialog = useConfirmDialog()

    const result = dialog.confirm()
    dialog.cancel()

    expect(await result).toBe(false)
    expect(dialog.state.open).toBe(false)
  })

  it('asks for a destructive confirmation on confirmDelete', async () => {
    const dialog = useConfirmDialog()

    const result = dialog.confirmDelete()

    expect(dialog.state.options.destructive).toBe(true)
    dialog.accept()
    expect(await result).toBe(true)
  })

  it('cancels a pending confirmation when a new one is requested', async () => {
    const dialog = useConfirmDialog()

    const first = dialog.confirm({ title: 'first' })
    const second = dialog.confirm({ title: 'second' })

    expect(await first).toBe(false)
    expect(dialog.state.options.title).toBe('second')

    dialog.accept()
    expect(await second).toBe(true)
  })

  it('ignores accept and cancel when nothing is pending', () => {
    const dialog = useConfirmDialog()

    expect(() => {
      dialog.accept()
      dialog.cancel()
    }).not.toThrow()
  })
})
