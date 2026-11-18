import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import i18n from '@/locales'

function dialogButton(text: string): HTMLButtonElement {
  const button = [...document.body.querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  if (!button) {
    throw new Error(`no button "${text}"`)
  }
  return button
}

describe('ConfirmDialog', () => {
  beforeEach(() => {
    mount(ConfirmDialog, { attachTo: document.body, global: { plugins: [i18n] } })
  })

  afterEach(() => {
    useConfirmDialog().cancel()
  })

  it('stays closed until a confirmation is requested', () => {
    expect(document.body.textContent).not.toContain('Confirmação')
  })

  it('shows the default texts and resolves true when confirmed', async () => {
    const result = useConfirmDialog().confirmDelete()
    await flushPromises()

    expect(document.body.textContent).toContain('Confirmação')
    expect(document.body.textContent).toContain('Confirma a exclusão do registro?')

    dialogButton('Excluir').click()

    expect(await result).toBe(true)
  })

  it('resolves false when cancelled', async () => {
    const result = useConfirmDialog().confirm()
    await flushPromises()

    dialogButton('Cancelar').click()

    expect(await result).toBe(false)
  })

  it('resolves false when dismissed with Escape', async () => {
    const result = useConfirmDialog().confirm()
    await flushPromises()

    document.body
      .querySelector('[role="alertdialog"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(await result).toBe(false)
  })

  it('shows custom texts', async () => {
    const result = useConfirmDialog().confirm({
      title: 'Archive?',
      description: 'It can be restored later.',
      confirmLabel: 'Archive',
      cancelLabel: 'Keep',
    })
    await flushPromises()

    expect(document.body.textContent).toContain('Archive?')
    expect(document.body.textContent).toContain('It can be restored later.')
    expect(dialogButton('Keep')).toBeTruthy()

    dialogButton('Archive').click()
    await result
  })

  it('styles the confirm button as destructive only when asked to', async () => {
    const plain = useConfirmDialog().confirm()
    await flushPromises()
    expect(dialogButton('Excluir').className).not.toContain('bg-destructive')
    useConfirmDialog().cancel()
    await plain

    const destructive = useConfirmDialog().confirmDelete()
    await flushPromises()
    expect(dialogButton('Excluir').className).toContain('bg-destructive')
    useConfirmDialog().cancel()
    await destructive
  })
})
