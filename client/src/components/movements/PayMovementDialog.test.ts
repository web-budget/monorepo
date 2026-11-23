import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PayMovementDialog from '@/components/movements/PayMovementDialog.vue'
import { Select } from '@/components/ui/select'
import { createTestPlugins } from '@/test/mounting'
import { problem, settle } from '@/test/crud'
import { installZodErrorMap } from '@/schemas/zodErrorMap'

interface Payable {
  id: string
  name: string
  type: 'INCOME' | 'EXPENSE'
  value: number
  invoicePayment?: boolean
  suggestedCard?: string | null
}

const expense: Payable = { id: 'm-1', name: 'Conta de água', type: 'EXPENSE', value: 100 }
const income: Payable = { id: 'm-2', name: 'Salário', type: 'INCOME', value: 8400 }
const wallets = [{ id: 'w-1', name: 'Conta corrente' }] as never[]
const cards = [{ id: 'k-1', name: 'Visa Platinum' }] as never[]

async function render(
  movement: Payable | null,
  balanceOf = vi.fn<(id: string) => Promise<number>>(),
) {
  installZodErrorMap()
  const { plugins } = createTestPlugins()
  const wrapper = mount(PayMovementDialog, {
    props: { movement, wallets, cards, loading: false, balanceOf },
    attachTo: document.body,
    global: { plugins },
  })
  await flushPromises()
  return { wrapper, balanceOf }
}

function lastSelect(wrapper: Awaited<ReturnType<typeof render>>['wrapper']) {
  const selects = wrapper.findAllComponents(Select)
  return selects[selects.length - 1]!
}

function input(name: string) {
  return document.body.querySelector<HTMLInputElement>(`[name="${name}"]`)!
}

async function type(name: string, value: string) {
  const element = input(name)
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}

async function submit() {
  document.body.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
  await settle()
}

describe('PayMovementDialog', () => {
  beforeEach(() => {
    document.body.replaceChildren()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 21))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('stays closed without a movement', async () => {
    await render(null)

    expect(document.body.querySelector('form')).toBeNull()
  })

  it('titles the dialog by the type of the movement', async () => {
    const { wrapper } = await render(expense)
    expect(document.body.textContent).toContain('Pagar “Conta de água”')

    wrapper.unmount()
    document.body.replaceChildren()
    await render(income)
    expect(document.body.textContent).toContain('Receber “Salário”')
  })

  it('opens on today and sums up the payment, with the balance of the chosen wallet', async () => {
    const { wrapper, balanceOf } = await render(expense, vi.fn().mockResolvedValue(1000))

    expect(input('paidOn').value).toBe('2026-11-21')
    lastSelect(wrapper).vm.$emit('update:modelValue', 'w-1')
    await flushPromises()
    await type('discount', '1500')

    expect(balanceOf).toHaveBeenCalledWith('w-1')
    const summary = document.body.querySelector('[data-slot="payment-summary"]')!.textContent!
    expect(summary).toMatch(/Saldo da carteira\s*R\$\s1\.000,00/)
    expect(summary).toMatch(/Valor pago\s*R\$\s85,00/)
    expect(summary).toMatch(/Saldo depois\s*R\$\s915,00/)
  })

  it('adds an income to the balance', async () => {
    const { wrapper } = await render(income, vi.fn().mockResolvedValue(1000))

    lastSelect(wrapper).vm.$emit('update:modelValue', 'w-1')
    await flushPromises()

    const summary = document.body.querySelector('[data-slot="payment-summary"]')!.textContent!
    expect(summary).toMatch(/Valor recebido\s*R\$\s8\.400,00/)
    expect(summary).toMatch(/Saldo depois\s*R\$\s9\.400,00/)
  })

  it('hides the balance until a wallet is chosen and when it cannot be read', async () => {
    const { wrapper } = await render(expense, vi.fn().mockRejectedValue(problem(500)))

    expect(document.body.querySelector('[data-slot="payment-summary"]')!.textContent).not.toContain(
      'Saldo da carteira',
    )
    lastSelect(wrapper).vm.$emit('update:modelValue', 'w-1')
    await flushPromises()

    expect(document.body.querySelector('[data-slot="payment-summary"]')!.textContent).not.toContain(
      'Saldo depois',
    )
    expect(document.body.querySelector('[data-slot="server-error"]')).not.toBeNull()
  })

  it('forgets the balance when the wallet is cleared', async () => {
    const { wrapper } = await render(expense, vi.fn().mockResolvedValue(1000))
    lastSelect(wrapper).vm.$emit('update:modelValue', 'w-1')
    await flushPromises()

    lastSelect(wrapper).vm.$emit('update:modelValue', '')
    await flushPromises()

    expect(document.body.querySelector('[data-slot="payment-summary"]')!.textContent).not.toContain(
      'Saldo da carteira',
    )
  })

  it('asks for the wallet before paying', async () => {
    const { wrapper } = await render(expense)

    await submit()

    expect(wrapper.emitted('pay')).toBeUndefined()
    expect(document.body.textContent).toContain('Campo obrigatório')
  })

  it('refuses a discount as big as the value', async () => {
    const { wrapper } = await render(expense, vi.fn().mockResolvedValue(0))
    lastSelect(wrapper).vm.$emit('update:modelValue', 'w-1')
    await type('discount', '10000')

    await submit()

    expect(wrapper.emitted('pay')).toBeUndefined()
    expect(document.body.textContent).toContain('O desconto precisa ser menor que o valor.')
  })

  it('emits the payment with the date, the wallet and the discount', async () => {
    const { wrapper } = await render(expense, vi.fn().mockResolvedValue(0))
    lastSelect(wrapper).vm.$emit('update:modelValue', 'w-1')
    await type('discount', '500')

    await submit()

    expect(wrapper.emitted('pay')).toEqual([
      [expense, { wallet: 'w-1', paidOn: '2026-11-21', discount: 5 }],
    ])
  })

  it('offers the card only for an expense that is not an invoice payment', async () => {
    const { wrapper } = await render(expense)
    expect(wrapper.findAllComponents(Select)).toHaveLength(2)

    wrapper.unmount()
    document.body.replaceChildren()
    const income = await render({ ...expense, type: 'INCOME' })
    expect(income.wrapper.findAllComponents(Select)).toHaveLength(1)

    income.wrapper.unmount()
    document.body.replaceChildren()
    const invoice = await render({ ...expense, invoicePayment: true })
    expect(invoice.wrapper.findAllComponents(Select)).toHaveLength(1)
  })

  it('pays on the card, with no balance and a note about the invoice', async () => {
    const { wrapper } = await render(expense, vi.fn().mockResolvedValue(1000))
    wrapper.findAllComponents(Select)[0]!.vm.$emit('update:modelValue', 'CARD')
    await flushPromises()
    lastSelect(wrapper).vm.$emit('update:modelValue', 'k-1')
    await type('discount', '500')

    expect(document.body.querySelector('[data-slot="card-note"]')).not.toBeNull()
    expect(document.body.querySelector('[data-slot="payment-summary"]')!.textContent).not.toContain(
      'Saldo',
    )

    await submit()

    expect(wrapper.emitted('pay')).toEqual([
      [expense, { card: 'k-1', paidOn: '2026-11-21', discount: 5 }],
    ])
  })

  it('asks for the card before paying on it', async () => {
    const { wrapper } = await render(expense)
    wrapper.findAllComponents(Select)[0]!.vm.$emit('update:modelValue', 'CARD')
    await flushPromises()

    await submit()

    expect(wrapper.emitted('pay')).toBeUndefined()
    expect(document.body.textContent).toContain('Campo obrigatório')
  })

  it('emits close when the dialog is dismissed', async () => {
    const { wrapper } = await render(expense)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close from the cancel button', async () => {
    const { wrapper } = await render(expense)

    const cancel = [...document.body.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Cancelar',
    )!
    cancel.click()
    await flushPromises()

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('starts over when another movement opens it', async () => {
    const { wrapper } = await render(expense, vi.fn().mockResolvedValue(0))
    lastSelect(wrapper).vm.$emit('update:modelValue', 'w-1')
    await type('discount', '500')

    await wrapper.setProps({ movement: income })
    await flushPromises()

    expect(document.body.textContent).toContain('Receber “Salário”')
    expect(input('discount').value).toBe('')
  })
})

describe('PayMovementDialog with a suggested card', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('opens on the card the recurring movement suggests and pays on it', async () => {
    const { wrapper } = await render({ ...expense, suggestedCard: 'k-1' })

    expect(document.body.querySelector('[data-slot="card-note"]')).not.toBeNull()
    await submit()

    expect(wrapper.emitted('pay')![0]![1]).toMatchObject({ card: 'k-1' })
  })

  it('opens on the wallet when nothing is suggested', async () => {
    await render({ ...expense, suggestedCard: null })

    expect(document.body.querySelector('[data-slot="card-note"]')).toBeNull()
  })
})
