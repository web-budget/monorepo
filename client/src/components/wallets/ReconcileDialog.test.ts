import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import ReconcileDialog from '@/components/wallets/ReconcileDialog.vue'
import type { ReconcilableWallet } from '@/composables/useReconciliation'
import { installZodErrorMap } from '@/schemas/zodErrorMap'
import { settle } from '@/test/crud'
import { createTestPlugins } from '@/test/mounting'
import type { BalanceChange } from '@/utils/reconciliation'

const wallet: ReconcilableWallet = {
  id: 'w-1',
  name: 'Conta corrente',
  personal: false,
  balance: 1000,
}

async function render(
  target: ReconcilableWallet | null = wallet,
  extra: { messages?: string[]; balanceChange?: BalanceChange | null; loading?: boolean } = {},
) {
  installZodErrorMap()
  const { plugins } = createTestPlugins()
  const wrapper = mount(ReconcileDialog, {
    props: { wallet: target, loading: false, messages: [], balanceChange: null, ...extra },
    attachTo: document.body,
    global: { plugins },
  })
  await flushPromises()
  return wrapper
}

function field(name: string) {
  return document.body.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)!
}

async function type(name: string, value: string) {
  const element = field(name)
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('blur'))
  await flushPromises()
}

async function submit() {
  document.body.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
  await settle()
}

function summary() {
  return document.body.querySelector('[data-slot="reconcile-summary"]')!.textContent!
}

function confirmButton() {
  return [...document.body.querySelectorAll('button')].find(
    (button) => button.textContent?.trim() === 'Conciliar',
  )!
}

describe('ReconcileDialog', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('stays closed without a wallet', async () => {
    await render(null)

    expect(document.body.querySelector('form')).toBeNull()
  })

  it('shows the server errors at the top of the dialog body', async () => {
    await render(wallet, { messages: ['A carteira está inativa'] })

    const alert = document.body.querySelector('[role="dialog"] [data-slot="server-error"]')
    expect(alert!.textContent).toContain('A carteira está inativa')
  })

  it('opens empty, with the dashes in the summary and no reason', async () => {
    await render()

    expect(document.body.textContent).toContain('Conciliar Conta corrente')
    expect(document.body.textContent).toContain('Saldo no banco agora')
    expect(summary()).toMatch(/Saldo da carteira\s*1\.000,00/)
    expect(summary()).toMatch(/Saldo informado\s*—/)
    expect(summary()).toMatch(/Diferença\s*—/)
    expect(summary()).not.toContain('R$')
    expect(document.body.querySelector('[data-slot="balance-matches"]')).toBeNull()
    expect(field('reason')).toBeNull()
    expect(confirmButton().disabled).toBe(false)
  })

  it('asks for the cash counted in a personal wallet', async () => {
    await render({ ...wallet, personal: true })

    expect(document.body.textContent).toContain('Dinheiro contado agora')
    expect(document.body.textContent).not.toContain('Saldo no banco agora')
  })

  it('says there is nothing to reconcile and disables the button when the balance matches', async () => {
    await render()

    await type('informedBalance', '100000')

    expect(summary()).toMatch(/Diferença\s*0,00/)
    expect(document.body.querySelector('[data-slot="balance-matches"]')!.textContent).toContain(
      'O saldo bate com o banco. Não há o que conciliar.',
    )
    expect(confirmButton().disabled).toBe(true)
    expect(field('reason')).toBeNull()
  })

  it('shows a positive difference without a sign, in the income tone, and asks for the reason', async () => {
    await render()

    await type('informedBalance', '101240')

    expect(summary()).toMatch(/Saldo informado\s*1\.012,40/)
    expect(summary()).toMatch(/Diferença\s*12,40/)
    expect(summary()).not.toContain('+')
    expect(
      document.body.querySelector('[data-slot="reconcile-summary"] [data-direction="income"]')!
        .textContent,
    ).toBe('12,40')
    expect(document.body.textContent).toContain('Motivo')
    expect(document.body.querySelector('[data-slot="reason-counter"]')!.textContent).toContain(
      '0/150',
    )
    expect(confirmButton().disabled).toBe(false)
  })

  it('signs only a negative difference, in the expense tone', async () => {
    await render()

    await type('informedBalance', '96500')

    expect(summary()).toMatch(/Diferença\s*−35,00/)
    expect(
      document.body.querySelector('[data-slot="reconcile-summary"] [data-direction="expense"]')!
        .textContent,
    ).toBe('−35,00')
  })

  it('accepts a negative informed balance and signs the negative balance of the wallet', async () => {
    await render({ ...wallet, balance: -10 })

    expect(summary()).toMatch(/Saldo da carteira\s*−10,00/)

    await type('informedBalance', '-500')

    expect(field('informedBalance').value).toBe('−5,00')
    expect(summary()).toMatch(/Saldo informado\s*−5,00/)
    expect(summary()).toMatch(/Diferença\s*5,00/)
  })

  it('counts the characters of the reason', async () => {
    await render()
    await type('informedBalance', '101240')

    await type('reason', 'Centavos do banco')

    expect(document.body.querySelector('[data-slot="reason-counter"]')!.textContent).toContain(
      '17/150',
    )
    expect(field('reason').getAttribute('maxlength')).toBe('150')
  })

  it('asks for the balance', async () => {
    const wrapper = await render()

    await submit()

    expect(wrapper.emitted('reconcile')).toBeUndefined()
    expect(document.body.textContent).toContain('Informe o saldo.')
  })

  it('asks for a value when only a minus sign was typed', async () => {
    const wrapper = await render()
    await type('informedBalance', '-')

    await submit()

    expect(wrapper.emitted('reconcile')).toBeUndefined()
    expect(document.body.textContent).toContain('Informe um valor como 4.812,37 ou −120,00.')
  })

  it('asks for the reason of the difference', async () => {
    const wrapper = await render()
    await type('informedBalance', '101240')
    await type('reason', '   ')

    await submit()

    expect(wrapper.emitted('reconcile')).toBeUndefined()
    expect(document.body.textContent).toContain('Informe o motivo da diferença.')
  })

  it('emits the informed balance, the balance it showed and the trimmed reason', async () => {
    const wrapper = await render()
    await type('informedBalance', '101240')
    await type('reason', '  Centavos do banco  ')

    await submit()

    expect(wrapper.emitted('reconcile')).toEqual([
      [wallet, { informedBalance: 1012.4, shownBalance: 1000, reason: 'Centavos do banco' }],
    ])
  })

  it('emits nothing when the balance matches', async () => {
    const wrapper = await render()
    await type('informedBalance', '100000')

    await submit()

    expect(wrapper.emitted('reconcile')).toBeUndefined()
  })

  it('disables the button while loading', async () => {
    await render(wallet, { loading: true })

    expect(confirmButton().disabled).toBe(true)
  })

  it('explains that the balance changed and keeps what was typed against the new balance', async () => {
    const wrapper = await render()
    await type('informedBalance', '101240')
    await type('reason', 'Centavos do banco')

    await wrapper.setProps({
      wallet: { ...wallet, balance: 1018.5 },
      balanceChange: { balance: 1018.5, difference: -6.1 },
    })
    await flushPromises()

    const alert = document.body.querySelector('[data-slot="balance-changed"]')!
    expect(alert.textContent).toContain('O saldo da carteira mudou enquanto você conciliava')
    expect(alert.textContent).toContain('O saldo passou a 1.018,50. A diferença agora é −6,10.')
    expect(field('informedBalance').value).toBe('1.012,40')
    expect(field('reason').value).toBe('Centavos do banco')
    expect(summary()).toMatch(/Saldo da carteira\s*1\.018,50/)
    expect(summary()).toMatch(/Diferença\s*−6,10/)

    await submit()

    expect(wrapper.emitted('reconcile')).toEqual([
      [
        { ...wallet, balance: 1018.5 },
        { informedBalance: 1012.4, shownBalance: 1018.5, reason: 'Centavos do banco' },
      ],
    ])
  })

  it('does not take the focus from the field when the cancel button is pressed', async () => {
    await render()
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true })

    const cancel = [...document.body.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Cancelar',
    )!
    cancel.dispatchEvent(press)

    expect(press.defaultPrevented).toBe(true)
  })

  it('emits close from the cancel button and from dismissing', async () => {
    const wrapper = await render()

    const cancel = [...document.body.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Cancelar',
    )!
    cancel.click()
    await flushPromises()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    expect(wrapper.emitted('close')).toHaveLength(2)
  })

  it('starts over when another wallet opens it', async () => {
    const wrapper = await render()
    await type('informedBalance', '101240')

    await wrapper.setProps({
      wallet: { id: 'w-2', name: 'Poupança', personal: false, balance: 10 },
    })
    await flushPromises()

    expect(field('informedBalance').value).toBe('')
    expect(summary()).toMatch(/Saldo da carteira\s*10,00/)
    expect(summary()).toMatch(/Diferença\s*—/)
  })
})
