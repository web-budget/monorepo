import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { cardsApi } from '@/api/cards'
import { movementsApi } from '@/api/movements'
import { walletsApi } from '@/api/wallets'
import PayMovementDialog from '@/components/movements/PayMovementDialog.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, pageOf, problem } from '@/test/crud'
import type { MovementView } from '@/types'
import MovementDetailView from '@/views/financial/movements/MovementDetailView.vue'

vi.mock('@/api/cards')
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

async function render(movement: MovementView) {
  vi.mocked(movementsApi.findById).mockResolvedValue(movement)
  return mountView(MovementDetailView, 'movements', { id: movement.id })
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
    expect(wrapper.text()).toMatch(/−\sR\$\s96,12/)
    expect(wrapper.text()).toContain('Moradia')
    expect(wrapper.text()).toContain('Mensal')
    expect(wrapper.text()).toContain('Sem pagamento.')
    expect(wrapper.find('[data-slot="overdue-notice"]').text()).toContain('Venceu em 20/11/2026')
    expect(wrapper.find('[data-slot="overdue-notice"]').text()).toContain('Em aberto há 1 dia.')
    expect(wrapper.find('[data-slot="paid-notice"]').exists()).toBe(false)
    expect(buttons(wrapper)).toEqual(['Remover', 'Editar', 'Pagar'])
  })

  it('offers to receive an income', async () => {
    const { wrapper } = await render({ ...open, type: 'INCOME' })

    expect(buttons(wrapper)).toContain('Receber')
  })

  it('shows the payment of a paid movement and only offers to undo it', async () => {
    const { wrapper } = await render(paid)

    expect(wrapper.text()).toContain('Receita')
    expect(wrapper.text()).toMatch(/\+\sR\$\s8\.400,00/)
    expect(wrapper.text()).toContain('05/11/2026')
    expect(wrapper.text()).toContain('Conta corrente')
    expect(wrapper.text()).toContain('Carteira')
    expect(wrapper.text()).toMatch(/R\$\s8\.300,00/)
    expect(wrapper.find('[data-slot="paid-notice"]').text()).toContain('Pago: não se edita')
    expect(wrapper.find('[data-slot="overdue-notice"]').exists()).toBe(false)
    expect(buttons(wrapper)).toEqual(['Desfazer pagamento'])
  })

  it('shows a card payment', async () => {
    const { wrapper } = await render({
      ...paid,
      payment: { ...paid.payment!, wallet: null, card: { id: 'c-1', name: 'Visa' } },
    })

    expect(wrapper.text()).toContain('Cartão de crédito')
    expect(wrapper.text()).toContain('Visa')
    expect(wrapper.text()).toContain('Pago no cartão')
  })

  it('shows an invoice payment with its invoice instead of the classification, and cannot be edited', async () => {
    const { wrapper } = await render({
      ...open,
      overdue: false,
      classification: null,
      costCenter: null,
      invoice: { id: 'i-1', status: 'CLOSED', card: { id: 'c-1', name: 'Visa' } },
    })

    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual([
      'Identificação',
      'Fatura',
      'Pagamento',
    ])
    expect(wrapper.text()).toContain('Fechada')
    expect(wrapper.find('a[href="/financial/invoices/i-1/detail"]').text()).toBe('Abrir a fatura')
    expect(buttons(wrapper)).not.toContain('Editar')
    expect(buttons(wrapper)).toContain('Remover')

    await buttonWithText(wrapper, 'Pagar').trigger('click')
    expect(wrapper.getComponent(PayMovementDialog).props('movement')).toMatchObject({
      invoicePayment: true,
    })
  })

  it('says the period is closed and offers nothing to change', async () => {
    const { wrapper } = await render({
      ...open,
      overdue: false,
      costCenter: null,
      classification: null,
      financialPeriod: { id: 'p-0', name: 'Setembro', status: 'CLOSED', expired: false },
    })

    expect(wrapper.find('[data-slot="closed-notice"]').text()).toContain(
      'Período encerrado: Setembro',
    )
    expect(wrapper.find('[data-slot="paid-notice"]').exists()).toBe(false)
    expect(buttons(wrapper)).toEqual([])
    expect(wrapper.text()).toContain('---')
  })

  it('shows the title while the movement is loading', async () => {
    vi.mocked(movementsApi.findById).mockReturnValue(new Promise(() => undefined))

    const { wrapper } = await mountView(MovementDetailView, 'movements', { id: 'm-1' })

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

    await buttonWithText(wrapper, 'Remover').trigger('click')
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

  it('undoes the payment after confirmation and reloads it', async () => {
    vi.mocked(movementsApi.undoPayment).mockResolvedValue({
      ...paid,
      status: 'OPEN',
      payment: null,
    })
    const { wrapper } = await render(paid)
    const dialog = useConfirmDialog()

    await buttonWithText(wrapper, 'Desfazer pagamento').trigger('click')
    expect(dialog.state.options.title).toBe('Desfazer o pagamento de “Salário”?')
    dialog.accept()
    await flushPromises()

    expect(movementsApi.undoPayment).toHaveBeenCalledWith('m-2')
    expect(toast.success).toHaveBeenCalledWith('Pagamento desfeito', expect.anything())
    expect(movementsApi.findById).toHaveBeenCalledTimes(2)
  })

  it('does nothing when the undo is not confirmed', async () => {
    const { wrapper } = await render(paid)

    await buttonWithText(wrapper, 'Desfazer pagamento').trigger('click')
    useConfirmDialog().cancel()
    await flushPromises()

    expect(movementsApi.undoPayment).not.toHaveBeenCalled()
  })

  it('does not reload after an undo that fails', async () => {
    vi.mocked(movementsApi.undoPayment).mockRejectedValue(
      problem(400, { error: 'movement-not-paid' }),
    )
    const { wrapper } = await render(paid)

    await buttonWithText(wrapper, 'Desfazer pagamento').trigger('click')
    useConfirmDialog().accept()
    await flushPromises()

    expect(movementsApi.findById).toHaveBeenCalledTimes(1)
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

    const { wrapper } = await mountView(MovementDetailView, 'movements', { id: 'x' })

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
  })
})
