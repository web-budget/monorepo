import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import DeleteCompartmentDialog from '@/components/compartments/DeleteCompartmentDialog.vue'
import { createTestPlugins } from '@/test/mounting'
import type { CompartmentView } from '@/types'

const compartment: CompartmentView = {
  id: 'k-1',
  name: 'Emergency',
  type: 'RESERVE',
  balance: 0,
  statementEntryCount: 3,
  achieved: false,
  overdue: false,
}

async function render(target: CompartmentView | null, messages: string[] = []) {
  const { plugins } = createTestPlugins()
  const wrapper = mount(DeleteCompartmentDialog, {
    props: { compartment: target, walletName: 'Main', loading: false, messages },
    attachTo: document.body,
    global: { plugins },
  })
  await flushPromises()
  return wrapper
}

function button(text: string) {
  return [...document.body.querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
}

describe('DeleteCompartmentDialog', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('stays closed without a piggy bank', async () => {
    await render(null)

    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })

  it('says how many statement lines go away with an empty piggy bank, and confirms', async () => {
    const wrapper = await render(compartment)

    expect(document.body.textContent).toContain('Excluir Emergency?')
    expect(document.body.textContent).toContain(
      'O histórico dele e as 3 linhas no extrato do saldo livre também são excluídos.',
    )

    button('Excluir')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    button('Cancelar')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('says the singular when only one line goes away', async () => {
    await render({ ...compartment, statementEntryCount: 1 })

    expect(document.body.textContent).toContain(
      'O histórico dele e a linha no extrato do saldo livre também são excluídos.',
    )
  })

  it('says nothing about lines when there are none, and shows the server errors', async () => {
    await render({ ...compartment, statementEntryCount: 0 }, ['Algo deu errado'])

    expect(document.body.textContent).not.toContain('linha no extrato')
    expect(document.body.querySelector('[data-slot="server-error"]')!.textContent).toContain(
      'Algo deu errado',
    )
  })

  it('shows how much it still has and offers to withdraw everything', async () => {
    const wrapper = await render({ ...compartment, balance: 1050 })

    expect(document.body.textContent).toMatch(/Emergency ainda tem R\$\s?1\.050,00/)
    expect(document.body.textContent).toContain(
      'Resgate tudo para o saldo livre antes de excluir.',
    )
    expect(button('Excluir')).toBeUndefined()

    button('Resgatar tudo')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    button('Fechar')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(wrapper.emitted('withdrawAll')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
