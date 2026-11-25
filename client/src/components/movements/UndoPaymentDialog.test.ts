import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import UndoPaymentDialog from '@/components/movements/UndoPaymentDialog.vue'
import { createTestPlugins } from '@/test/mounting'
import type { MovementView } from '@/types'

const paidExpense = {
  id: 'm-1',
  name: 'Conta de água',
  type: 'EXPENSE',
  value: 100,
  payment: {
    paidOn: '2026-11-05',
    value: 100,
    discount: 10,
    valuePaid: 90,
    wallet: { id: 'w-1', name: 'Conta corrente' },
    card: null,
  },
} as MovementView

const paidIncome = {
  ...paidExpense,
  id: 'm-2',
  name: 'Salário',
  type: 'INCOME',
  payment: { ...paidExpense.payment!, valuePaid: 8300 },
} as MovementView

const paidOnCard = {
  ...paidExpense,
  payment: { ...paidExpense.payment!, wallet: null, card: { id: 'k-1', name: 'Visa Platinum' } },
} as MovementView

const withoutPayment = { ...paidExpense, payment: null } as MovementView

async function render(movement: MovementView | null, loading = false, messages: string[] = []) {
  const { plugins } = createTestPlugins()
  const wrapper = mount(UndoPaymentDialog, {
    props: { movement, loading, messages },
    attachTo: document.body,
    global: { plugins },
  })
  await flushPromises()
  return wrapper
}

function buttonWithText(text: string) {
  return [...document.body.querySelectorAll('button')].find(
    (button) => button.textContent?.trim() === text,
  )!
}

function reversal() {
  return document.body.querySelector('[data-slot="reversal"]')!.textContent!
}

describe('UndoPaymentDialog', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('shows the server errors at the top of the dialog body', async () => {
    await render(paidExpense, false, ['Pagamento já desfeito'])

    const alert = document.body.querySelector('[role="dialog"] [data-slot="server-error"]')
    expect(alert!.textContent).toContain('Pagamento já desfeito')
  })

  it('stays closed without a movement', async () => {
    await render(null)

    expect(document.body.querySelector('[data-slot="reversal"]')).toBeNull()
  })

  it('names the movement and the wallet the value goes back to', async () => {
    await render(paidExpense)

    expect(document.body.textContent).toContain('Desfazer o pagamento de “Conta de água”?')
    expect(document.body.textContent).toContain('O valor volta para Conta corrente como estorno.')
  })

  it('highlights the word reversal in the description', async () => {
    await render(paidExpense)

    expect(document.body.querySelector('[role="dialog"] strong')!.textContent).toBe('estorno')
  })

  it('shows the reversal of an expense as a credit', async () => {
    await render(paidExpense)

    expect(reversal()).toMatch(/Estorno de \+R\$\s90,00/)
    expect(document.body.querySelector('[data-slot="reversal"] .text-income')).not.toBeNull()
  })

  it('shows the reversal of an income as a debit', async () => {
    await render(paidIncome)

    expect(reversal()).toMatch(/Estorno de −R\$\s8\.300,00/)
    expect(document.body.querySelector('[data-slot="reversal"] .text-expense')).not.toBeNull()
  })

  it('says the purchase leaves the invoice when it was paid on the card', async () => {
    await render(paidOnCard)

    expect(document.body.textContent).toContain('A compra sai da fatura de Visa Platinum.')
  })

  it('copes with a movement that has no payment', async () => {
    await render(withoutPayment)

    expect(reversal()).toMatch(/Estorno de \+R\$\s0,00/)
  })

  it('emits confirm with the movement', async () => {
    const wrapper = await render(paidExpense)

    buttonWithText('Desfazer').click()
    await flushPromises()

    expect(wrapper.emitted('confirm')).toEqual([[paidExpense]])
  })

  it('disables the confirm button while loading', async () => {
    await render(paidExpense, true)

    expect((buttonWithText('Desfazer') as HTMLButtonElement).disabled).toBe(true)
  })

  it('emits close from the cancel button', async () => {
    const wrapper = await render(paidExpense)

    buttonWithText('Cancelar').click()
    await flushPromises()

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close when the dialog is dismissed', async () => {
    const wrapper = await render(paidExpense)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('keeps rendering while it closes', async () => {
    const wrapper = await render(paidExpense)

    await wrapper.setProps({ movement: null })
    await flushPromises()

    expect(document.body.querySelector('[data-slot="reversal"]')).toBeNull()
  })
})
