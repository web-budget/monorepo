import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import AdjustBalanceDialog from '@/components/wallets/AdjustBalanceDialog.vue'
import { installZodErrorMap } from '@/schemas/zodErrorMap'
import { settle } from '@/test/crud'
import { createTestPlugins } from '@/test/mounting'

const wallet = { id: 'w-1', name: 'Conta corrente', balance: 1000 }

async function render(target: typeof wallet | null = wallet) {
  installZodErrorMap()
  const { plugins } = createTestPlugins()
  const wrapper = mount(AdjustBalanceDialog, {
    props: { wallet: target, loading: false },
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

  it('stays closed without a wallet', async () => {
    await render(null)

    expect(document.body.querySelector('form')).toBeNull()
  })

  it('names the wallet and sums up the balance after the adjustment', async () => {
    await render()

    expect(document.body.textContent).toContain('Ajustar o saldo de Conta corrente')
    expect(summary()).toMatch(/Saldo depois\s*R\$\s1\.000,00/)

    await type('value', '-0.02')

    expect(summary()).toMatch(/−\sR\$\s0,02/)
    expect(summary()).toMatch(/Saldo depois\s*R\$\s999,98/)
  })

  it('treats a value that is not a number as no adjustment', async () => {
    await render()

    await type('value', 'abc')

    expect(summary()).toMatch(/Saldo depois\s*R\$\s1\.000,00/)
  })

  it('asks for the value and the reason', async () => {
    const wrapper = await render()

    await submit()

    expect(wrapper.emitted('adjust')).toBeUndefined()
    expect(document.body.textContent).toContain('Campo obrigatório')
  })

  it('refuses an adjustment of zero', async () => {
    const wrapper = await render()
    await type('value', '0')
    await type('name', 'Arredondamento')

    await submit()

    expect(wrapper.emitted('adjust')).toBeUndefined()
    expect(document.body.textContent).toContain('O ajuste não pode ser zero.')
  })

  it('emits the adjustment with the sign and the reason', async () => {
    const wrapper = await render()
    await type('value', '0.03')
    await type('name', 'Arredondamento')

    await submit()

    expect(wrapper.emitted('adjust')).toEqual([[wallet, { value: 0.03, name: 'Arredondamento' }]])
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
