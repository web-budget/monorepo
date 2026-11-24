import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { toast } from 'vue-sonner'
import { cardsApi } from '@/api/cards'
import { invoicesApi } from '@/api/invoices'
import { movementsApi } from '@/api/movements'
import { walletsApi } from '@/api/wallets'
import PayMovementDialog from '@/components/movements/PayMovementDialog.vue'
import UndoPaymentDialog from '@/components/movements/UndoPaymentDialog.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { installZodErrorMap } from '@/schemas/zodErrorMap'
import { buttonWithText, crudTestRoutes, pageOf, problem } from '@/test/crud'
import { createTestPlugins } from '@/test/mounting'
import type { MovementView } from '@/types'
import MovementDetailView from '@/views/financial/movements/MovementDetailView.vue'

vi.mock('@/api/cards')
vi.mock('@/api/invoices')
vi.mock('@/api/movements')
vi.mock('@/api/wallets')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const open: MovementView = {
  id: 'm-1',
  name: 'Conta de água',
  type: 'EXPENSE',
  value: 96.12,
  dueDate: '2026-11-20',
  status: 'OPEN',
  overdue: true,
  classification: { id: 'cl-1', name: 'Moradia', type: 'EXPENSE' },
  costCenter: { id: 'cc-1', name: 'Casa', fullName: 'Casa' },
  financialPeriod: { id: 'p-1', name: 'Novembro', status: 'OPEN', expired: false },
  description: 'Mensal',
  payment: null,
}

const paid: MovementView = {
  ...open,
  id: 'm-2',
  name: 'Salário',
  type: 'INCOME',
  value: 8400,
  status: 'PAID',
  overdue: false,
  description: null,
  payment: {
    paidOn: '2026-11-05',
    value: 8400,
    discount: 100,
    valuePaid: 8300,
    wallet: { id: 'w-1', name: 'Conta corrente' },
    card: null,
  },
}

const buttons = (wrapper: Awaited<ReturnType<typeof render>>['wrapper']) =>
  wrapper.findAll('button').map((button) => button.text())

const extraRoutes = [
  ...['statement', 'invoices', 'financial-periods'].map((name) => ({
    path: `/${name}`,
    name,
    component: { render: () => h('div') },
  })),
  { path: '/invoices/:id', name: 'invoices.detail', component: { render: () => h('div') } },
]

async function mountDetail(id: string) {
  installZodErrorMap()
  const { router, plugins } = createTestPlugins({
    routes: [...crudTestRoutes('movements'), ...extraRoutes],
    stubActions: false,
  })
  const wrapper = mount(MovementDetailView, {
    props: { id },
    attachTo: document.body,
    global: { plugins },
  })
  await flushPromises()
  return { wrapper, router }
}

async function render(movement: MovementView) {
  vi.mocked(movementsApi.findById).mockResolvedValue(movement)
  return mountDetail(movement.id)
}

describe('MovementDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 21))
    vi.mocked(walletsApi.findAll).mockResolvedValue(
      pageOf([{ id: 'w-1', name: 'Conta' }] as never[]),
    )
    vi.mocked(cardsApi.findAll).mockResolvedValue(pageOf([{ id: 'c-1', name: 'Visa' }] as never[]))
    vi.mocked(invoicesApi.findAll).mockResolvedValue(pageOf([{ id: 'i-1' }] as never[]))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows an open overdue movement with its notice, no payment and its actions', async () => {
    const { wrapper } = await render(open)

    expect(movementsApi.findById).toHaveBeenCalledWith('m-1')
    expect(wrapper.find('h1').text()).toBe('Conta de água')
    expect(wrapper.find('[data-slot="page-title"]').element.parentElement!.textContent).toContain(
      'Vencido há 1 dia',
    )
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual([
      'Identificação',
      'Pagamento',
    ])
    expect(wrapper.text()).toContain('Despesa')
    expect(wrapper.text()).toMatch(/R\$\s96,12/)
    expect(wrapper.text()).not.toMatch(/[−+]\s?R\$/)
    expect(wrapper.text()).toContain('Moradia')
    expect(wrapper.text()).toContain('Sem pagamento.')
    expect(wrapper.find('[data-slot="overdue-notice"]').text()).toContain('Venceu em 20/11/2026')
    expect(wrapper.find('[data-slot="overdue-notice"]').text()).toContain('Em aberto há 1 dia.')
    expect(wrapper.find('[data-slot="paid-notice"]').exists()).toBe(false)
    expect(wrapper.find('[data-slot="closed-notice"]').exists()).toBe(false)
    expect(buttons(wrapper)).toEqual(['Excluir', 'Editar', 'Pagar'])
  })

  it('offers to receive an income', async () => {
    const { wrapper } = await render({ ...open, type: 'INCOME' })

    expect(buttons(wrapper)).toContain('Receber')
  })

  it('shows the payment of a paid movement and offers to see the statement and to undo it', async () => {
    const { wrapper } = await render(paid)

    expect(wrapper.text()).toContain('Receita')
    expect(wrapper.text()).toMatch(/R\$\s8\.400,00/)
    expect(wrapper.text()).not.toMatch(/[−+]\s?R\$/)
    expect(wrapper.text()).toContain('05/11/2026')
    expect(wrapper.text()).toContain('Conta corrente')
    expect(wrapper.text()).toContain('Carteira')
    expect(wrapper.text()).toMatch(/R\$\s100,00/)
    expect(wrapper.text()).toMatch(/R\$\s8\.300,00/)
    expect(wrapper.find('[data-slot="paid-notice"]').text()).toContain('Pago: não se edita')
    expect(wrapper.find('[data-slot="overdue-notice"]').exists()).toBe(false)
    expect(buttons(wrapper)).toEqual(['Desfazer pagamento'])
    expect(wrapper.find('a[href="/statement?wallet=w-1"]').text()).toBe('Ver no extrato')
  })

  it('shows "---" when the payment had no discount', async () => {
    const { wrapper } = await render({
      ...paid,
      payment: { ...paid.payment!, discount: 0, valuePaid: 8400 },
    })

    expect(wrapper.text()).toContain('---')
  })

  it('shows a card payment and links to the invoice', async () => {
    const { wrapper } = await render({
      ...paid,
      payment: { ...paid.payment!, wallet: null, card: { id: 'c-1', name: 'Visa' } },
    })

    expect(wrapper.text()).toContain('Cartão de crédito')
    expect(wrapper.text()).toContain('Visa')
    expect(wrapper.text()).toContain('Pago no cartão')
    expect(wrapper.find('a[href="/invoices?card=c-1&period=p-1"]').text()).toBe('Ver na fatura')
  })

  it('links a card payment to the invoice itself when the server says which one', async () => {
    const { wrapper } = await render({
      ...paid,
      payment: {
        ...paid.payment!,
        wallet: null,
        card: { id: 'c-1', name: 'Visa' },
        invoice: { id: 'i-9', status: 'OPEN' },
      },
    })

    expect(wrapper.find('a[href="/invoices/i-9"]').text()).toBe('Ver na fatura')
  })

  it('offers no link for a paid movement without wallet or card', async () => {
    const { wrapper } = await render({
      ...paid,
      payment: { ...paid.payment!, wallet: null, card: null },
    })

    expect(wrapper.find('[data-slot="detail-footer"] a').exists()).toBe(false)
    expect(buttons(wrapper)).toEqual(['Desfazer pagamento'])
  })

  it('shows a paid movement that came without its payment', async () => {
    const { wrapper } = await render({ ...paid, payment: null })

    expect(wrapper.text()).toContain('Sem pagamento.')
    expect(wrapper.find('[data-slot="detail-footer"] a').exists()).toBe(false)
  })

  it('shows an invoice payment without classification, with a link to the invoice instead of Editar', async () => {
    const { wrapper } = await render({
      ...open,
      overdue: false,
      classification: null,
      costCenter: null,
      invoice: {
        id: 'i-1',
        status: 'CLOSED',
        card: { id: 'c-1', name: 'Visa', lastFourDigits: '4821' },
      },
    })

    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual([
      'Identificação',
      'Pagamento',
    ])
    expect(wrapper.text()).not.toContain('Situação da fatura')
    const labels = wrapper.findAll('dt').map((label) => label.text())
    expect(labels).toContain('Centro de custo')
    expect(labels).toContain('Classificação')
    const dashes = wrapper.findAll('dd span.text-muted-foreground').map((dash) => dash.text())
    expect(dashes).toEqual(['—', '—'])
    const link = wrapper.find('[data-slot="page-actions"] a')
    expect(link.text()).toBe('Ver a fatura')
    expect(link.attributes('href')).toBe('/invoices/i-1')
    expect(buttons(wrapper)).not.toContain('Editar')
    expect(buttons(wrapper)).toContain('Excluir')

    await buttonWithText(wrapper, 'Pagar').trigger('click')
    expect(wrapper.getComponent(PayMovementDialog).props('movement')).toMatchObject({
      invoicePayment: true,
    })
  })

  it('links the recurring movement and pays on the card it suggests', async () => {
    const { wrapper } = await render({
      ...open,
      recurringMovement: { id: 'r-1', name: 'Celular novo', card: { id: 'k-1', name: 'Visa' } },
    })

    expect(wrapper.find('a[href="/financial/recurring-movements/r-1/detail"]').text()).toBe(
      'Celular novo',
    )
    expect(wrapper.text()).toContain('Recorrente')
    await buttonWithText(wrapper, 'Pagar').trigger('click')
    expect(wrapper.getComponent(PayMovementDialog).props('movement')).toMatchObject({
      suggestedCard: 'k-1',
    })
  })

  it('has no suggested card when the recurring movement has none', async () => {
    const { wrapper } = await render({
      ...open,
      recurringMovement: { id: 'r-1', name: 'Aluguel', card: null },
    })

    await buttonWithText(wrapper, 'Pagar').trigger('click')
    expect(wrapper.getComponent(PayMovementDialog).props('movement')).toMatchObject({
      suggestedCard: undefined,
    })
  })

  it('says the period is closed, links to the periods and offers nothing to change', async () => {
    const { wrapper } = await render({
      ...open,
      overdue: false,
      costCenter: null,
      classification: null,
      financialPeriod: { id: 'p-0', name: 'Setembro', status: 'CLOSED', expired: false },
    })

    expect(wrapper.find('[data-slot="closed-notice"]').text()).toContain(
      'Período encerrado em Setembro',
    )
    expect(wrapper.find('[data-slot="closed-notice"] a').text()).toBe('Ver períodos')
    expect(wrapper.find('[data-slot="closed-notice"] a').attributes('href')).toBe(
      '/financial-periods',
    )
    expect(wrapper.find('[data-slot="paid-notice"]').exists()).toBe(false)
    expect(buttons(wrapper)).toEqual([])
    expect(wrapper.text()).toContain('—')
  })

  it('does not offer to undo a payment of a closed period', async () => {
    const { wrapper } = await render({
      ...paid,
      financialPeriod: { id: 'p-0', name: 'Setembro', status: 'CLOSED', expired: false },
    })

    expect(wrapper.find('[data-slot="closed-notice"]').exists()).toBe(true)
    expect(wrapper.find('[data-slot="paid-notice"]').exists()).toBe(false)
    expect(buttons(wrapper)).toEqual([])
    expect(wrapper.find('[data-slot="detail-footer"] a').text()).toBe('Ver no extrato')
  })

  it('shows the title while the movement is loading', async () => {
    vi.mocked(movementsApi.findById).mockReturnValue(new Promise(() => undefined))

    const { wrapper } = await mountDetail('m-1')

    expect(wrapper.find('h1').text()).toBe('Detalhando')
  })

  it('goes to the edit form', async () => {
    const { wrapper, router } = await render(open)

    await buttonWithText(wrapper, 'Editar').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('movements.update')
    expect(router.currentRoute.value.params.id).toBe('m-1')
  })

  it('asks first, naming the movement, then deletes it and goes to the list', async () => {
    vi.mocked(movementsApi.remove).mockResolvedValue(undefined)
    const { wrapper, router } = await render(open)
    const dialog = useConfirmDialog()

    await buttonWithText(wrapper, 'Excluir').trigger('click')
    expect(dialog.state.options.title).toBe('Excluir “Conta de água”?')
    dialog.accept()
    await flushPromises()

    expect(movementsApi.remove).toHaveBeenCalledWith('m-1')
    expect(toast.success).toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('movements')
  })

  it('pays the movement from the dialog and reloads it', async () => {
    vi.mocked(movementsApi.pay).mockResolvedValue({ ...open, status: 'PAID', overdue: false })
    const { wrapper } = await render(open)

    await buttonWithText(wrapper, 'Pagar').trigger('click')
    const dialog = wrapper.getComponent(PayMovementDialog)
    expect(dialog.props('movement')).toMatchObject({ id: 'm-1' })

    dialog.vm.$emit('pay', dialog.props('movement'), { wallet: 'w-1', paidOn: '2026-11-21' })
    await flushPromises()

    expect(movementsApi.pay).toHaveBeenCalledWith('m-1', { wallet: 'w-1', paidOn: '2026-11-21' })
    expect(toast.success).toHaveBeenCalledWith('Pagamento registrado', expect.anything())
    expect(dialog.props('movement')).toBeNull()
    expect(movementsApi.findById).toHaveBeenCalledTimes(2)
  })

  it('says the income was received', async () => {
    vi.mocked(movementsApi.pay).mockResolvedValue(paid)
    const { wrapper } = await render({ ...open, type: 'INCOME' })

    await buttonWithText(wrapper, 'Receber').trigger('click')
    const dialog = wrapper.getComponent(PayMovementDialog)
    dialog.vm.$emit('pay', dialog.props('movement'), { wallet: 'w-1', paidOn: '2026-11-21' })
    await flushPromises()

    expect(toast.success).toHaveBeenCalledWith('Recebimento registrado', {
      description: 'Entrou em Conta corrente, linha nova no extrato.',
      duration: 4000,
    })
  })

  it('says the expense went to the invoice when paid on the card', async () => {
    vi.mocked(movementsApi.pay).mockResolvedValue({
      ...open,
      status: 'PAID',
      payment: { ...paid.payment!, wallet: null, card: { id: 'c-1', name: 'Visa' } },
    })
    const { wrapper } = await render(open)

    await buttonWithText(wrapper, 'Pagar').trigger('click')
    const dialog = wrapper.getComponent(PayMovementDialog)
    dialog.vm.$emit('pay', dialog.props('movement'), { card: 'c-1', paidOn: '2026-11-21' })
    await flushPromises()

    expect(toast.success).toHaveBeenCalledWith('Pagamento registrado', {
      description: 'Entrou na fatura de Visa.',
      duration: 4000,
    })
  })

  it('keeps the dialog open and shows the error when the payment fails', async () => {
    vi.mocked(movementsApi.pay).mockRejectedValue(problem(400, { error: 'invalid-discount' }))
    const { wrapper } = await render(open)

    await buttonWithText(wrapper, 'Pagar').trigger('click')
    const dialog = wrapper.getComponent(PayMovementDialog)
    dialog.vm.$emit('pay', dialog.props('movement'), { wallet: 'w-1' })
    await flushPromises()

    expect(dialog.props('movement')).not.toBeNull()
    expect(wrapper.find('[data-slot="server-error"]').text()).toContain('desconto')
  })

  it('closes the dialog without paying', async () => {
    const { wrapper } = await render(open)

    await buttonWithText(wrapper, 'Pagar').trigger('click')
    wrapper.getComponent(PayMovementDialog).vm.$emit('close')
    await flushPromises()

    expect(wrapper.getComponent(PayMovementDialog).props('movement')).toBeNull()
  })

  it('opens the reversal dialog with the movement before undoing the payment', async () => {
    const { wrapper } = await render(paid)
    expect(wrapper.getComponent(UndoPaymentDialog).props('movement')).toBeNull()

    await buttonWithText(wrapper, 'Desfazer pagamento').trigger('click')
    await flushPromises()

    expect(wrapper.getComponent(UndoPaymentDialog).props('movement')).toMatchObject({
      id: 'm-2',
    })
    expect(document.body.textContent).toContain('Desfazer o pagamento de “Salário”?')
    expect(movementsApi.undoPayment).not.toHaveBeenCalled()
  })

  it('undoes the payment after the dialog confirms and reloads it', async () => {
    vi.mocked(movementsApi.undoPayment).mockResolvedValue({
      ...paid,
      status: 'OPEN',
      payment: null,
    })
    const { wrapper } = await render(paid)

    await buttonWithText(wrapper, 'Desfazer pagamento').trigger('click')
    await flushPromises()
    const dialog = wrapper.getComponent(UndoPaymentDialog)
    dialog.vm.$emit('confirm', dialog.props('movement'))
    await flushPromises()

    expect(movementsApi.undoPayment).toHaveBeenCalledWith('m-2')
    expect(toast.success).toHaveBeenCalledWith('Pagamento desfeito', expect.anything())
    expect(dialog.props('movement')).toBeNull()
    expect(movementsApi.findById).toHaveBeenCalledTimes(3)
  })

  it('closes the reversal dialog without undoing', async () => {
    const { wrapper } = await render(paid)

    await buttonWithText(wrapper, 'Desfazer pagamento').trigger('click')
    await flushPromises()
    wrapper.getComponent(UndoPaymentDialog).vm.$emit('close')
    await flushPromises()

    expect(wrapper.getComponent(UndoPaymentDialog).props('movement')).toBeNull()
    expect(movementsApi.undoPayment).not.toHaveBeenCalled()
  })

  it('keeps the dialog open and does not reload after an undo that fails', async () => {
    vi.mocked(movementsApi.undoPayment).mockRejectedValue(
      problem(400, { error: 'movement-not-paid' }),
    )
    const { wrapper } = await render(paid)

    await buttonWithText(wrapper, 'Desfazer pagamento').trigger('click')
    await flushPromises()
    const dialog = wrapper.getComponent(UndoPaymentDialog)
    dialog.vm.$emit('confirm', dialog.props('movement'))
    await flushPromises()

    expect(dialog.props('movement')).not.toBeNull()
    expect(movementsApi.findById).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
  })

  it('shows the server error when the wallets cannot be loaded', async () => {
    vi.mocked(walletsApi.findAll).mockRejectedValue(problem(500))

    const { wrapper } = await render(open)

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
  })

  it('shows the server error when the movement cannot be loaded', async () => {
    vi.mocked(movementsApi.findById).mockRejectedValue(
      problem(404, { error: 'resource-not-found' }),
    )

    const { wrapper } = await mountDetail('x')

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
  })
})
