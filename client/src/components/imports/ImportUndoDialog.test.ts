import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import ImportUndoDialog from '@/components/imports/ImportUndoDialog.vue'
import { Dialog } from '@/components/ui/dialog'
import { createTestPlugins } from '@/test/mounting'
import type { ImportView } from '@/types'

const item = {
  id: 'i-1',
  fileName: 'fatura.ofx',
  target: 'CARD',
  result: { created: 1, linked: 0, recurring: 0, transfers: 0, compartments: 0, ignored: 0 },
} as ImportView

const walletItem = {
  ...item,
  target: 'WALLET',
  result: { created: 1, linked: 0, recurring: 0, transfers: 0, compartments: 2, ignored: 0 },
} as ImportView

function render(target = item) {
  const { plugins } = createTestPlugins()
  return mount(ImportUndoDialog, {
    props: { open: true, item: target, messages: [], loading: false },
    attachTo: document.body,
    global: { plugins },
  })
}

function dialogButton(text: string) {
  return Array.from(document.body.querySelectorAll('[data-slot="undo-dialog"] button')).find(
    (candidate) => candidate.textContent?.trim() === text,
  ) as HTMLButtonElement
}

describe('ImportUndoDialog', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('asks to close from the cancel button, which keeps the focus where it is, and from the dialog', async () => {
    const wrapper = render()
    await flushPromises()

    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    dialogButton('Cancelar').dispatchEvent(press)
    dialogButton('Cancelar').click()
    wrapper.findComponent(Dialog).vm.$emit('update:open', false)

    expect(press.defaultPrevented).toBe(true)
    expect(wrapper.emitted('close')).toHaveLength(2)
  })

  it('asks to undo and waits while it is loading', async () => {
    const wrapper = render()
    await flushPromises()

    dialogButton('Desfazer').click()
    await wrapper.setProps({ loading: true })

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(dialogButton('Desfazer').disabled).toBe(true)
  })
  it('tells the movements of the compartments that will be removed, in a wallet only', async () => {
    render(walletItem)
    await flushPromises()

    expect(document.body.querySelector('[data-slot="undo-effects"]')!.textContent).toContain(
      'Remove 2 movimentações de cofrinho, do extrato do saldo livre e do histórico.',
    )
  })

  it('leaves the compartments out when the import moved none', async () => {
    render({ ...walletItem, result: { ...walletItem.result, compartments: 0 } } as ImportView)
    await flushPromises()

    expect(document.body.querySelector('[data-slot="undo-effects"]')!.textContent).not.toContain(
      'cofrinho',
    )
  })
})
