import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import AdjustBalanceDialog from '@/components/wallets/AdjustBalanceDialog.vue'
import { installZodErrorMap } from '@/schemas/zodErrorMap'
import { settle } from '@/test/crud'
import { createTestPlugins } from '@/test/mounting'

const wallet = { id: 'w-1', name: 'Conta corrente', balance: 1000 }

async function render(target: typeof wallet | null = wallet, messages: string[] = []) {
  installZodErrorMap()
  const { plugins } = createTestPlugins()
  const wrapper = mount(AdjustBalanceDialog, {
    props: { wallet: target, loading: false, messages },
    attachTo: document.body,
    global: { plugins },
  })
  await flushPromises()
  return wrapper
}

function input(name: string) {
  return document.body.querySelector<HTMLInputElement>(`[name="${name}"]`)!
}

async function type(name: string, value: string) {
  const element = input(name)
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
  return document.body.querySelector('[data-slot="adjust-summary"]')!.textContent!
}

describe('AdjustBalanceDialog', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('shows the server errors at the top of the dialog body', async () => {
    await render(wallet, ['A carteira está inativa'])

    const alert = document.body.querySelector('[role="dialog"] [data-slot="server-error"]')
    expect(alert!.textContent).toContain('A carteira está inativa')
  })

  it('stays closed without a wallet', async () => {
    await render(null)

    expect(document.body.querySelector('form')).toBeNull()
  })

  it('names the wallet and sums up the balance after the adjustment', async () => {
    await render()

    expect(document.body.textContent).toContain('Ajustar o saldo de Conta corrente')
    expect(summary()).toMatch(/Saldo depois\s*R\$\s1\.000,00/)
    expect(summary()).not.toContain('+')

    await type('value', '-2')

    expect(input('value').value).toBe('−0,02')
    expect(summary()).toMatch(/Ajuste\s*−R\$\s0,02/)
    expect(summary()).toMatch(/Saldo depois\s*R\$\s999,98/)
  })

  it('credits without a sign and keeps a lone minus sign waiting for the digits', async () => {
    await render()

    await type('value', '3')
    expect(input('value').value).toBe('0,03')
    expect(summary()).toMatch(/Ajuste\s*R\$\s0,03/)
    expect(summary()).not.toContain('+')

    await type('value', '-')
    expect(input('value').value).toBe('−')

    await type('value', '−5')
    expect(input('value').value).toBe('−0,05')

    await type('value', '+0,05')
    expect(input('value').value).toBe('0,05')
  })

  it('signs a negative balance and the balance left after a debit', async () => {
    await render({ ...wallet, balance: -10 })

    expect(summary()).toMatch(/Saldo da carteira\s*−R\$\s10,00/)

    await type('value', '-5')

    expect(summary()).toMatch(/Saldo depois\s*−R\$\s10,05/)
  })

  it('treats a value that is not a number as no adjustment', async () => {
    await render()

    await type('value', 'abc')

    expect(summary()).toMatch(/Saldo depois\s*R\$\s1\.000,00/)
  })

  it('asks for the value', async () => {
    const wrapper = await render()

    await submit()

    expect(wrapper.emitted('adjust')).toBeUndefined()
    expect(document.body.textContent).toContain('Campo obrigatório')
  })

  it('refuses an adjustment of zero', async () => {
    const wrapper = await render()
    await type('value', '0')

    await submit()

    expect(wrapper.emitted('adjust')).toBeUndefined()
    expect(document.body.textContent).toContain('O ajuste não pode ser zero.')
  })

  it('emits the adjustment with the sign', async () => {
    const wrapper = await render()
    await type('value', '3')

    await submit()

    expect(wrapper.emitted('adjust')).toEqual([[wallet, { value: 0.03 }]])
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
    await type('value', '5')

    await wrapper.setProps({ wallet: { id: 'w-2', name: 'Poupança', balance: 10 } })
    await flushPromises()

    expect(input('value').value).toBe('')
    expect(summary()).toMatch(/Saldo depois\s*R\$\s10,00/)
  })
})
