import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GiveBackDialog from '@/components/transfers/GiveBackDialog.vue'
import { problem } from '@/test/crud'
import { createTestPlugins } from '@/test/mounting'
import type { TransferView } from '@/types'

const transfer = {
  id: 't-1',
  value: 500,
  fromWallet: { id: 'w-1', name: 'Conta corrente' },
  toWallet: { id: 'w-2', name: 'Poupança' },
} as TransferView

const balances: Record<string, number> = { 'w-1': 500, 'w-2': 550 }

function balanceOf(id: string) {
  return Promise.resolve(balances[id]!)
}

async function render(target: TransferView | null = null) {
  const { plugins } = createTestPlugins()
  const wrapper = mount(GiveBackDialog, {
    props: { transfer: null, loading: false, balanceOf },
    attachTo: document.body,
    global: { plugins },
  })
  await flushPromises()
  if (target) {
    await wrapper.setProps({ transfer: target })
    await flushPromises()
  }
  return wrapper
}

describe('GiveBackDialog', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('stays closed without a transfer', async () => {
    await render()

    expect(document.body.querySelector('[data-slot="transfer-statement"]')).toBeNull()
  })

  it('shows the return the other way round with the balances after it', async () => {
    await render(transfer)

    expect(document.body.textContent).toContain(
      'Devolver a transferência de Conta corrente para Poupança?',
    )
    const from = document.body.querySelector('[data-side="from"]')!.textContent!
    const to = document.body.querySelector('[data-side="to"]')!.textContent!
    expect(from).toContain('Poupança')
    expect(from).toMatch(/Saldo depois\s*R\$\s50,00/)
    expect(to).toContain('Conta corrente')
    expect(to).toMatch(/Saldo depois\s*R\$\s1.000,00/)
  })

  it('emits confirm with the transfer and close from the cancel button', async () => {
    const wrapper = await render(transfer)
    const buttons = [...document.body.querySelectorAll('button')]

    buttons.find((button) => button.textContent?.trim() === 'Devolver')!.click()
    buttons.find((button) => button.textContent?.trim() === 'Cancelar')!.click()
    await flushPromises()

    expect(wrapper.emitted('confirm')).toEqual([[transfer]])
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close when dismissed', async () => {
    const wrapper = await render(transfer)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('shows the error when a balance cannot be read', async () => {
    const wrapper = await render()
    const failing = vi.fn<(id: string) => Promise<number>>().mockRejectedValue(problem(500))

    await wrapper.setProps({ balanceOf: failing, transfer })
    await flushPromises()

    expect(document.body.querySelector('[data-slot="server-error"]')).not.toBeNull()
  })
})
