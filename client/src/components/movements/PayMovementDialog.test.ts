import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { invoicesApi } from '@/api/invoices'
import PayMovementDialog from '@/components/movements/PayMovementDialog.vue'
import { Select } from '@/components/ui/select'
import { installZodErrorMap } from '@/schemas/zodErrorMap'
import { pageOf, problem, settle } from '@/test/crud'
import { createTestPlugins } from '@/test/mounting'

vi.mock('@/api/invoices')

interface Payable {
  id: string
  name: string
  type: 'INCOME' | 'EXPENSE'
  value: number
  invoicePayment?: boolean
  financialPeriod?: { id: string; name: string }
}

const expense: Payable = {
  id: 'm-1',
  name: 'Conta de água',
  type: 'EXPENSE',
  value: 100,
  financialPeriod: { id: 'p-11', name: 'Novembro de 2026' },
}
const income: Payable = { id: 'm-2', name: 'Salário', type: 'INCOME', value: 8400 }
const wallets = [
  { id: 'w-1', name: 'Conta corrente' },
  { id: 'w-2', name: 'Poupança' },
] as never[]
const cards = [{ id: 'k-1', name: 'Visa Platinum' }] as never[]

async function render(
  movement: Payable | null,
  balanceOf = vi.fn<(id: string) => Promise<number>>(),
  options: { wallets?: never[]; cards?: never[] } = {},
) {
  installZodErrorMap()
  const { plugins } = createTestPlugins()
  const wrapper = mount(PayMovementDialog, {
    props: {
      movement,
      wallets: options.wallets ?? wallets,
      cards: options.cards ?? cards,
      loading: false,
      balanceOf,
    },
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

function buttonWithText(text: string) {
  return [...document.body.querySelectorAll('button')].find(
    (button) => button.textContent?.trim() === text,
  )
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

async function payByCard() {
  buttonWithText('Cartão de crédito')!.click()
  await flushPromises()
}

function summary() {
  return document.body.querySelector('[data-slot="payment-summary"]')!.textContent!
}

describe('PayMovementDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 21))
    vi.mocked(invoicesApi.findAll).mockResolvedValue(pageOf([{ id: 'i-1' }] as never[]))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('stays closed without a movement', async () => {
    await render(null)

    expect(document.body.querySelector('form')).toBeNull()
  })

  it('titles the dialog as a payment for an expense', async () => {
    await render(expense)

    expect(document.body.textContent).toContain('Pagar “Conta de água”')
  })

  it('titles the dialog as a receipt for an income', async () => {
    await render(income)

    expect(document.body.textContent).toContain('Receber “Salário”')
  })

  it('opens on today with the first wallet chosen and a confirm button with a check icon', async () => {
    await render(expense)

    expect(input('paidOn').value).toBe('2026-11-21')
    expect(document.body.textContent).toContain('Conta corrente')
    expect(buttonWithText('Confirmar')!.querySelector('svg')).not.toBeNull()
  })

  it('sums up the payment, with the balance of the chosen wallet', async () => {
    const { wrapper, balanceOf } = await render(expense, vi.fn().mockResolvedValue(1000))

    lastSelect(wrapper).vm.$emit('update:modelValue', 'w-2')
    await flushPromises()
    await type('discount', '1500')

    expect(balanceOf).toHaveBeenCalledWith('w-2')
    expect(summary()).toMatch(/Saldo da carteira\s*R\$\s1\.000,00/)
    expect(summary()).toMatch(/Valor pago\s*R\$\s85,00/)
    expect(summary()).toMatch(/Saldo depois\s*R\$\s915,00/)
  })

  it('counts a cleared discount as zero', async () => {
    await render(expense, vi.fn().mockResolvedValue(1000))
    await type('discount', '500')

    await type('discount', '')

    expect(summary()).toMatch(/Valor pago\s*R\$\s100,00/)
  })

  it('adds an income to the balance', async () => {
    const { wrapper } = await render(income, vi.fn().mockResolvedValue(1000))

    lastSelect(wrapper).vm.$emit('update:modelValue', 'w-2')
    await flushPromises()

    expect(summary()).toMatch(/Valor recebido\s*R\$\s8\.400,00/)
    expect(summary()).toMatch(/Saldo depois\s*R\$\s9\.400,00/)
  })

  it('hides the balance until it is read and when it cannot be read', async () => {
    const { wrapper } = await render(expense, vi.fn().mockRejectedValue(problem(500)))

    expect(summary()).not.toContain('Saldo da carteira')
    lastSelect(wrapper).vm.$emit('update:modelValue', 'w-2')
    await flushPromises()

    expect(summary()).not.toContain('Saldo depois')
    expect(document.body.querySelector('[data-slot="server-error"]')).not.toBeNull()
  })

  it('forgets the balance when the wallet is cleared', async () => {
    const { wrapper } = await render(expense, vi.fn().mockResolvedValue(1000))
    lastSelect(wrapper).vm.$emit('update:modelValue', 'w-2')
    await flushPromises()

    lastSelect(wrapper).vm.$emit('update:modelValue', '')
    await flushPromises()

    expect(summary()).not.toContain('Saldo da carteira')
  })

  it('opens with no wallet and no card when there are none', async () => {
    const { wrapper } = await render(expense, vi.fn(), { wallets: [], cards: [] })

    await submit()

    expect(wrapper.emitted('pay')).toBeUndefined()
    expect(document.body.textContent).toContain('Campo obrigatório')
  })

  it('asks for the wallet before paying', async () => {
    const { wrapper } = await render(expense)
    lastSelect(wrapper).vm.$emit('update:modelValue', '')
    await flushPromises()

    await submit()

    expect(wrapper.emitted('pay')).toBeUndefined()
    expect(document.body.textContent).toContain('Campo obrigatório')
  })

  it('refuses a discount as big as the value', async () => {
    const { wrapper } = await render(expense, vi.fn().mockResolvedValue(0))
    await type('discount', '10000')

    await submit()

    expect(wrapper.emitted('pay')).toBeUndefined()
    expect(document.body.textContent).toContain('O desconto precisa ser menor que o valor.')
  })

  it('emits the payment with the date, the preselected wallet and the discount', async () => {
    const { wrapper } = await render(expense, vi.fn().mockResolvedValue(0))
    await type('discount', '500')

    await submit()

    expect(wrapper.emitted('pay')).toEqual([
      [expense, { wallet: 'w-1', paidOn: '2026-11-21', discount: 5 }],
    ])
  })

  it('offers the method for an expense', async () => {
    const { wrapper } = await render(expense)

    expect(document.body.querySelector('[role="group"]')).not.toBeNull()
    expect(wrapper.findAllComponents(Select)).toHaveLength(1)
  })

  it('does not offer the method for an income', async () => {
    await render(income)

    expect(document.body.querySelector('[role="group"]')).toBeNull()
  })

  it('does not offer the method for an invoice payment', async () => {
    await render({ ...expense, invoicePayment: true })

    expect(document.body.querySelector('[role="group"]')).toBeNull()
  })

  it('pays on the card, showing the invoice instead of the balance and the wallet', async () => {
    const { wrapper } = await render(expense, vi.fn().mockResolvedValue(1000))

    await payByCard()
    await type('discount', '500')

    expect(wrapper.findAllComponents(Select)).toHaveLength(1)
    expect(document.body.textContent).not.toContain('Poupança')
    expect(document.body.querySelector('[data-slot="invoice-line"]')!.textContent).toContain(
      'Visa Platinum, Novembro',
    )
    expect(summary()).not.toContain('Saldo')
    expect(invoicesApi.findAll).toHaveBeenCalledWith({
      card: 'k-1',
      financialPeriod: 'p-11',
      statuses: ['OPEN'],
      size: 1,
    })
    expect(document.body.querySelector('[data-slot="no-open-invoice"]')).toBeNull()

    await submit()

    expect(wrapper.emitted('pay')).toEqual([
      [expense, { card: 'k-1', paidOn: '2026-11-21', discount: 5 }],
    ])
  })

  it('names the invoice without a period or card when they are unknown', async () => {
    await render({ id: 'm-3', name: 'Sem período', type: 'EXPENSE', value: 10 }, vi.fn(), {
      cards: [],
    })

    await payByCard()

    expect(document.body.querySelector('[data-slot="invoice-line"]')!.textContent).toContain(',')
    expect(invoicesApi.findAll).not.toHaveBeenCalled()
  })

  it('warns that there is no open invoice and blocks the payment', async () => {
    vi.mocked(invoicesApi.findAll).mockResolvedValue(pageOf([]))
    await render(expense)

    await payByCard()

    const alert = document.body.querySelector('[data-slot="no-open-invoice"]')!
    expect(alert.textContent).toContain('Não há fatura aberta de Visa Platinum em Novembro de 2026')
    expect(alert.textContent).toContain('Nada é lançado.')
    expect(buttonWithText('Confirmar')!.disabled).toBe(true)
  })

  it('goes on when the open invoice cannot be checked', async () => {
    vi.mocked(invoicesApi.findAll).mockRejectedValue(problem(500))
    await render(expense)

    await payByCard()

    expect(document.body.querySelector('[data-slot="no-open-invoice"]')).toBeNull()
    expect(buttonWithText('Confirmar')!.disabled).toBe(false)
  })

  it('asks for the card before paying on it', async () => {
    const { wrapper } = await render(expense)
    await payByCard()
    lastSelect(wrapper).vm.$emit('update:modelValue', '')
    await flushPromises()

    await submit()

    expect(wrapper.emitted('pay')).toBeUndefined()
    expect(document.body.textContent).toContain('Campo obrigatório')
  })

  it('disables the confirm button while loading', async () => {
    const { wrapper } = await render(expense)

    await wrapper.setProps({ loading: true })

    expect(buttonWithText('Confirmar')!.disabled).toBe(true)
  })

  it('emits close when the dialog is dismissed', async () => {
    const { wrapper } = await render(expense)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('does not take the focus from the field when the cancel button is pressed', async () => {
    await render(expense)
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true })

    buttonWithText('Cancelar')!.dispatchEvent(press)

    expect(press.defaultPrevented).toBe(true)
  })

  it('emits close from the cancel button', async () => {
    const { wrapper } = await render(expense)

    buttonWithText('Cancelar')!.click()
    await flushPromises()

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('closes when the movement is cleared', async () => {
    const { wrapper } = await render(expense)

    await wrapper.setProps({ movement: null })
    await flushPromises()

    expect(document.body.querySelector('form')).toBeNull()
  })

  it('starts over when another movement opens it', async () => {
    const { wrapper } = await render(expense, vi.fn().mockResolvedValue(0))
    await type('discount', '500')

    await wrapper.setProps({ movement: income })
    await flushPromises()

    expect(document.body.textContent).toContain('Receber “Salário”')
    expect(input('discount').value).toBe('0,00')
  })
})
