import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import CloseInvoiceDialog from '@/components/invoices/CloseInvoiceDialog.vue'
import { createTestPlugins } from '@/test/mounting'

const base: {
  open: boolean
  title: string
  purchases: number
  value: number
  dueDate: string | null
  walletName: string | null
  loading: boolean
  messages: string[]
} = {
  open: true,
  title: 'Fechar a fatura de Novembro, Visa?',
  purchases: 3,
  value: 500,
  dueDate: '2026-12-10',
  walletName: 'Conta corrente',
  loading: false,
  messages: [],
}

async function render(overrides: Partial<typeof base> = {}) {
  const { plugins } = createTestPlugins()
  const wrapper = mount(CloseInvoiceDialog, {
    props: { ...base, ...overrides },
    attachTo: document.body,
    global: { plugins },
  })
  await flushPromises()
  return wrapper
}

function button(text: string) {
  return [...document.body.querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )!
}

describe('CloseInvoiceDialog', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('shows the server errors at the top of the dialog body', async () => {
    await render({ messages: ['A fatura já está fechada'] })

    const alert = document.body.querySelector('[role="dialog"] [data-slot="server-error"]')
    expect(alert!.textContent).toContain('A fatura já está fechada')
  })

  it('sums up the purchases, the payment, the due date and the wallet', async () => {
    await render()

    const text = document.body.textContent!
    expect(text).toContain('Fechar a fatura de Novembro, Visa?')
    expect(text).toContain('Gera o pagamento de fatura')
    expect(text).toContain('500,00')
    expect(text).not.toContain('R$')
    expect(text).toContain('A carteira é escolhida ao pagar.')
    expect(text).toContain('10/12/2026')
    expect(text).toContain('Conta corrente')
  })

  it('leaves out the due date and the wallet when they are unknown', async () => {
    await render({ dueDate: null, walletName: null })

    const text = document.body.textContent!
    expect(text).toContain('Gera o pagamento de fatura')
    expect(text).not.toContain('Vencimento')
    expect(text).not.toContain('Carteira sugerida')
  })

  it('emits confirm and close from its buttons and close when dismissed', async () => {
    const wrapper = await render()

    button('Fechar fatura').click()
    button('Cancelar').click()
    await flushPromises()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(2)
  })
})
