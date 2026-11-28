import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { cardsApi } from '@/api/cards'
import { classificationsApi } from '@/api/classifications'
import { costCentersApi } from '@/api/costCenters'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { invoicesApi } from '@/api/invoices'
import { movementsApi } from '@/api/movements'
import { periodResultsApi } from '@/api/periodResults'
import { walletsApi } from '@/api/wallets'
import PayMovementDialog from '@/components/movements/PayMovementDialog.vue'
import { buttonWithText, crudTestRoutes, pageOf, problem, settle } from '@/test/crud'
import { createTestPlugins } from '@/test/mounting'
import type {
  ClosingSummaryView,
  ClosingInvoiceView,
  FinancialPeriodListView,
  MovementListView,
} from '@/types'
import PeriodClosingView from '@/views/financial/closing/PeriodClosingView.vue'

vi.mock('@/api/cards')
vi.mock('@/api/classifications')
vi.mock('@/api/costCenters')
vi.mock('@/api/financialPeriods')
vi.mock('@/api/invoices')
vi.mock('@/api/movements')
vi.mock('@/api/periodResults')
vi.mock('@/api/wallets')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const periods = [
  {
    id: 'p-11',
    name: 'Novembro',
    startingAt: '2026-11-01',
    endingAt: '2026-11-30',
    status: 'OPEN',
    expired: false,
    reopenable: false,
  },
  {
    id: 'p-10',
    name: 'Outubro',
    startingAt: '2026-10-01',
    endingAt: '2026-10-31',
    status: 'OPEN',
    expired: true,
    reopenable: false,
  },
  {
    id: 'p-09',
    name: 'Setembro',
    startingAt: '2026-09-01',
    endingAt: '2026-09-30',
    status: 'CLOSED',
    expired: false,
    reopenable: false,
  },
] as FinancialPeriodListView[]

const november = { id: 'p-11', name: 'Novembro', startingAt: '2026-11-01', endingAt: '2026-11-30' }

function invoiceOf(
  id: string,
  name: string,
  status: ClosingInvoiceView['status'],
  value: number,
  purchaseCount: number,
): ClosingInvoiceView {
  return {
    id,
    card: { id: `k-${id}`, name, lastFourDigits: `000${id.slice(-1)}` },
    status,
    value,
    purchaseCount,
  }
}

const blocking = invoiceOf('i-1', 'Visa', 'OPEN', 300, 2)
const empty = invoiceOf('i-2', 'Elo', 'OPEN', 0, 0)
const payment = invoiceOf('i-3', 'Master', 'CLOSED', 50, 1)
const paid = invoiceOf('i-4', 'Nubank', 'PAID', 80, 1)

const blocked: ClosingSummaryView = {
  openMovements: { count: 2, income: 0, expense: 150 },
  invoices: [blocking, empty, payment, paid],
  openInvoices: [blocking],
  emptyInvoices: [empty],
  nextOpenPeriod: november,
  targetPeriods: [november],
  canClose: false,
}

const ready: ClosingSummaryView = {
  openMovements: { count: 0, income: 0, expense: 0 },
  invoices: [],
  openInvoices: [],
  emptyInvoices: [],
  nextOpenPeriod: november,
  targetPeriods: [november],
  canClose: true,
}

const movements = [
  {
    id: 'm-1',
    name: 'Conta de luz',
    type: 'EXPENSE',
    value: 100,
    dueDate: '2026-10-20',
    overdue: true,
    invoicePayment: false,
  },
  {
    id: 'm-2',
    name: 'Fatura Master',
    type: 'EXPENSE',
    value: 50,
    dueDate: '2026-10-31',
    overdue: false,
    invoicePayment: true,
  },
  {
    id: 'm-3',
    name: 'Freela',
    type: 'INCOME',
    value: 200,
    dueDate: '2026-10-25',
    overdue: false,
    invoicePayment: false,
  },
] as MovementListView[]

function serve(
  summary: ClosingSummaryView = blocked,
  options: {
    pendencies?: MovementListView[]
    list?: typeof periods
    totals?: { revenues: number; expenses: number; result: number; accumulated: number }
  } = {},
) {
  const totals = options.totals ?? { revenues: 1000, expenses: 400, result: 600, accumulated: 2000 }
  vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf(options.list ?? periods))
  vi.mocked(costCentersApi.findAll).mockResolvedValue(pageOf([]))
  vi.mocked(classificationsApi.findAll).mockResolvedValue(pageOf([]))
  vi.mocked(financialPeriodsApi.findClosing).mockResolvedValue(summary)
  vi.mocked(financialPeriodsApi.findResult).mockResolvedValue({
    revenues: totals.revenues,
    expenses: totals.expenses,
    result: totals.result,
    recorded: false,
    toPay: 0,
    overdueExpenses: 0,
    paidOnCard: 0,
  })
  vi.mocked(periodResultsApi.findAccumulated).mockResolvedValue({
    recorded: 1400,
    provisional: 600,
    accumulated: totals.accumulated,
    provisionalPeriods: [],
  })
  vi.mocked(movementsApi.findAll).mockResolvedValue(pageOf(options.pendencies ?? movements))
  vi.mocked(walletsApi.findAll).mockResolvedValue(pageOf([{ id: 'w-1', name: 'Conta' }] as never[]))
  vi.mocked(cardsApi.findAll).mockResolvedValue(pageOf([]))
  vi.mocked(cardsApi.findById).mockResolvedValue({
    id: 'k-1',
    invoicePaymentDay: 10,
    wallet: { id: 'w-1', name: 'Conta' },
  } as never)
}

async function render(
  location = '/financial/closing',
  summary: ClosingSummaryView = blocked,
  options: Parameters<typeof serve>[1] = {},
) {
  serve(summary, options)
  const { router, plugins } = createTestPlugins({
    routes: [
      ...crudTestRoutes('financial-periods'),
      { path: '/financial/closing', name: 'closing', component: PeriodClosingView },
      {
        path: '/financial/movements/:id/detail',
        name: 'movements.detail',
        component: PeriodClosingView,
      },
    ],
    stubActions: false,
    initialState: {},
  })
  await router.push(location)
  const wrapper = mount(PeriodClosingView, { attachTo: document.body, global: { plugins } })
  await settle()
  return { wrapper, router }
}

type Wrapper = Awaited<ReturnType<typeof render>>['wrapper']

function dialogError() {
  return (
    document.body.querySelector('[role="dialog"] [data-slot="server-error"]')?.textContent ?? ''
  )
}

function dialogButton(label: string) {
  const button = [
    ...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'),
  ].find((candidate) => candidate.textContent?.trim() === label)
  if (!button) {
    throw new Error(`no dialog button "${label}"`)
  }
  return button
}

function rowOf(wrapper: Wrapper, text: string) {
  return wrapper.findAll('tbody tr').find((row) => row.text().includes(text))!
}

describe('PeriodClosingView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 21))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens on the oldest expired period, with its status, and keeps it in the URL', async () => {
    const { wrapper, router } = await render()

    expect(wrapper.find('h1').text()).toBe('Fechamento de Outubro')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe(
      'Resolva as pendências e grave o resultado.',
    )
    expect(wrapper.find('[data-slot="page-title"]').element.parentElement!.textContent).toContain(
      'Aberto · expirado',
    )
    expect(router.currentRoute.value.query.period).toBe('p-10')
    expect(financialPeriodsApi.findClosing).toHaveBeenCalledWith('p-10')
    expect(financialPeriodsApi.findResult).toHaveBeenCalledWith('p-10')
  })

  it('opens on the period of the URL, and on the default when it is not open', async () => {
    const requested = await render('/financial/closing?period=p-11')
    expect(requested.wrapper.find('h1').text()).toBe('Fechamento de Novembro')

    const unknown = await render('/financial/closing?period=p-09')
    expect(unknown.wrapper.find('h1').text()).toBe('Fechamento de Outubro')
  })

  it('opens on the oldest open period when nothing has expired', async () => {
    const { wrapper } = await render('/financial/closing', blocked, {
      list: periods.map((period) => ({ ...period, expired: false })),
    })

    expect(wrapper.find('h1').text()).toBe('Fechamento de Outubro')
  })

  it('shows the paid revenues and expenses, the result and the accumulated', async () => {
    const { wrapper } = await render()

    const summary = wrapper.find('[data-slot="summary"]').text()
    expect(summary).not.toContain('Resumo do período')
    expect(summary).toContain('Receitas pagas')
    expect(summary).toMatch(/Receitas pagasR\$\s1\.000,00/)
    expect(summary).toMatch(/Despesas pagasR\$\s400,00/)
    expect(summary).toMatch(/ResultadoR\$\s600,00/)
    expect(summary).toMatch(/AcumuladoR\$\s2\.000,00/)
    expect(summary).not.toMatch(/[+−]R\$/)
    expect(summary).toContain('Anteriores + atual')
  })

  it('signs only a negative result and accumulated, painting revenues and expenses by tone', async () => {
    const { wrapper } = await render('/financial/closing', blocked, {
      totals: { revenues: 0, expenses: 0, result: -400, accumulated: -400 },
    })

    const cards = wrapper.find('[data-slot="summary"]').findAll('[data-slot="currency"]')
    expect(cards.map((card) => card.text().split(String.fromCharCode(160)).join(' '))).toEqual([
      'R$ 0,00',
      'R$ 0,00',
      '−R$ 400,00',
      '−R$ 400,00',
    ])
    expect(
      cards.map((card) =>
        card.classes().filter((name) => name.startsWith('text-income') || name === 'text-expense'),
      ),
    ).toEqual([['text-income'], ['text-expense'], ['text-expense'], ['text-expense']])
  })

  it('leaves a zero or positive result and accumulated unsigned and in the default color', async () => {
    const { wrapper } = await render('/financial/closing', blocked, {
      totals: { revenues: 100, expenses: 100, result: 0, accumulated: 50 },
    })

    const cards = wrapper.find('[data-slot="summary"]').findAll('[data-slot="currency"]')
    expect(cards.map((card) => card.text().split(String.fromCharCode(160)).join(' '))).toEqual([
      'R$ 100,00',
      'R$ 100,00',
      'R$ 0,00',
      'R$ 50,00',
    ])
    expect(cards.slice(2).map((card) => card.attributes('data-direction'))).toEqual([
      undefined,
      undefined,
    ])
  })

  it('lists the pending items, marking the overdue and the invoice payment', async () => {
    const { wrapper } = await render()

    const rows = wrapper.find('[data-slot="pendencies"]').findAll('tbody tr')
    expect(rows).toHaveLength(3)
    expect(rows.map((row) => row.attributes('data-state'))).toEqual([
      'selected',
      'selected',
      'selected',
    ])
    expect(rows[0]!.text()).toContain('vencido')
    expect(rows[0]!.text()).toContain('20/10/2026')
    expect(rows[0]!.text()).toContain('100,00')
    expect(rows[0]!.text()).not.toMatch(/[+−]/)
    expect(rows[0]!.find('[data-slot="currency"]').classes()).toContain('text-expense')
    expect(rows[0]!.text()).not.toContain('R$')
    expect(rows[0]!.text()).not.toContain('fatura')
    expect(rows[1]!.text()).toContain('fatura')
    expect(rows[1]!.text()).not.toContain('vencido')
    expect(rows[2]!.text()).toContain('Receber')
    expect(rows[2]!.text()).toContain('200,00')
    expect(rows[2]!.text()).not.toMatch(/[+−]/)
    expect(rows[2]!.find('[data-slot="currency"]').classes()).toContain('text-income')
    expect(movementsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ statuses: ['OPEN'], financialPeriods: ['p-10'] }),
    )
  })

  it('counts the pending items and says whether there are some left', async () => {
    const { wrapper } = await render()
    expect(wrapper.find('[data-slot="remaining"]').text()).toBe('3 restantes')
    expect(wrapper.find('[data-slot="resolved"]').exists()).toBe(false)

    const single = await render('/financial/closing', blocked, { pendencies: [movements[0]!] })
    expect(single.wrapper.find('[data-slot="remaining"]').text()).toBe('1 restante')

    const none = await render('/financial/closing', ready, { pendencies: [] })
    expect(none.wrapper.find('[data-slot="remaining"]').exists()).toBe(false)
    expect(none.wrapper.find('[data-slot="resolved"]').text()).toBe('Resolvidas')
  })

  it('opens the movement from the row and from the name, without opening it from the buttons', async () => {
    const { wrapper, router } = await render()

    await wrapper.find('[data-slot="pendencies"] tbody tr a').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/financial/movements/m-1/detail')

    await router.push('/financial/closing')
    await rowOf(wrapper, 'Fatura Master').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/financial/movements/m-2/detail')

    await router.push('/financial/closing')
    await buttonWithText(wrapper, 'Pagar').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('closing')
  })

  it('shows each pending item as a card for small screens', async () => {
    const { wrapper, router } = await render()

    const cards = wrapper.findAll('[data-slot="pendency-card"]')
    expect(cards).toHaveLength(3)
    expect(cards[0]!.text()).toContain('Vence em 20/10/2026 · vencido')
    expect(cards[0]!.text()).toContain('100,00')
    expect(cards[0]!.text()).not.toMatch(/[+−]/)
    expect(cards[0]!.find('[data-slot="currency"]').classes()).toContain('text-expense')
    expect(cards[1]!.text()).toContain('fatura')
    expect(cards[1]!.text()).not.toContain('vencido')
    expect(cards[2]!.text()).toContain('Receber')

    const buttons = cards[0]!.findAll('button')
    await buttons[0]!.trigger('click')
    expect(wrapper.getComponent(PayMovementDialog).props('movement')).toMatchObject({ id: 'm-1' })
    await buttons[1]!.trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('Mover “Conta de luz”')

    await cards[2]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/financial/movements/m-3/detail')
  })

  it('says what blocks the closing and keeps the button off', async () => {
    const { wrapper } = await render()

    const checklist = wrapper.find('[data-slot="checklist"]')
    expect(checklist.findAll('li').map((item) => item.attributes('data-done'))).toEqual([
      'false',
      'false',
      'true',
    ])
    expect(checklist.text()).toContain('Para fechar')
    expect(checklist.text()).toContain('Pendências resolvidas')
    expect(checklist.text()).toContain('3 faltam pagar ou mover')
    expect(checklist.text()).toContain('Faturas resolvidas')
    expect(checklist.text()).toContain('1 fatura com lançamento ainda aberta')
    expect(checklist.text()).toContain('Período seguinte aberto')
    expect(checklist.text()).toContain('Novembro')
    expect(checklist.text()).not.toContain('Não há: pague tudo ou crie um')
    expect(checklist.text()).not.toContain('Não é preciso: nada a mover')
    expect(checklist.text()).not.toContain('Resolva os itens acima.')
    expect(buttonWithText(wrapper, 'Fechar Outubro').attributes('disabled')).toBeDefined()
  })

  it('uses the plural for several blocking invoices and for a single pending item', async () => {
    const second = invoiceOf('i-5', 'Outro', 'OPEN', 10, 1)
    const { wrapper } = await render(
      '/financial/closing',
      { ...blocked, invoices: [blocking, second], openInvoices: [blocking, second] },
      { pendencies: [movements[0]!] },
    )

    const checklist = wrapper.find('[data-slot="checklist"]').text()
    expect(checklist).toContain('1 falta pagar ou mover')
    expect(checklist).toContain('2 faturas com lançamento ainda abertas')
  })

  it('names only the month on the closing button', async () => {
    const { wrapper } = await render('/financial/closing', ready, {
      pendencies: [],
      list: periods.map((period) => ({ ...period, name: `${period.name} de 2026` })),
    })

    expect(buttonWithText(wrapper, 'Fechar Outubro').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('h1').text()).toBe('Fechamento de Outubro de 2026')
    expect(wrapper.find('[data-slot="checklist"]').text()).not.toContain('Tudo certo.')
    expect(wrapper.find('[data-slot="checklist"]').text()).toContain('Nada em aberto')
    expect(wrapper.find('[data-slot="checklist"]').text()).toContain('Nenhuma fatura bloqueia')
  })

  it('describes each invoice and offers closing only the one that blocks', async () => {
    const { wrapper } = await render()

    const items = wrapper.find('[data-slot="invoices"]').findAll('li')
    expect(
      items.map(
        (item) => item.attributes('data-note') ?? item.find('[data-note]').attributes('data-note'),
      ),
    ).toEqual(['blocking', 'empty', 'payment', 'paid'])
    expect(items[0]!.text()).toContain('Visa ••0001')
    expect(items[0]!.text()).toContain('2 compras · Aberta')
    expect(items[0]!.text()).toContain('Bloqueia o fechamento')
    expect(items[0]!.text()).toContain('300,00')
    expect(items[0]!.text()).not.toContain('R$')
    expect(items[1]!.text()).toContain('0 compras · Aberta')
    expect(items[1]!.text()).toContain('Fecha sozinha com valor zero')
    expect(items[2]!.text()).toContain('1 compra · Fechada')
    expect(items[2]!.text()).toContain('Pagamento de fatura nas pendências')
    expect(items[3]!.text()).toContain('1 compra · Paga')
    expect(items[3]!.text()).toContain('Paga')
    expect(
      wrapper.findAll('button').filter((button) => button.text() === 'Fechar fatura'),
    ).toHaveLength(1)
  })

  it('closes the blocking invoice from a dialog and reloads', async () => {
    const { wrapper } = await render()
    vi.mocked(invoicesApi.close).mockResolvedValue({ id: 'i-1', status: 'CLOSED' } as never)

    await buttonWithText(wrapper, 'Fechar fatura').trigger('click')
    await settle()
    expect(document.body.textContent).toContain('Fechar Outubro')
    expect(cardsApi.findById).toHaveBeenCalledWith('k-i-1')
    expect(document.body.textContent).toContain('Conta')
    dialogButton('Fechar fatura').click()
    await settle()

    expect(invoicesApi.close).toHaveBeenCalledWith('i-1')
    expect(toast.success).toHaveBeenCalledWith('Fatura fechada', expect.anything())
    expect(financialPeriodsApi.findClosing).toHaveBeenCalledTimes(2)
  })

  it('keeps the invoice dialog open when the server refuses and closes it with Cancel', async () => {
    const { wrapper } = await render()
    vi.mocked(invoicesApi.close).mockRejectedValue(problem(400, { error: 'invoice-not-open' }))
    vi.mocked(cardsApi.findById).mockResolvedValue({
      id: 'k-1',
      invoicePaymentDay: 10,
      wallet: null,
    } as never)

    await buttonWithText(wrapper, 'Fechar fatura').trigger('click')
    await settle()
    dialogButton('Fechar fatura').click()
    await settle()
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
    expect(dialogError()).toContain('A fatura não está aberta')
    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(false)
    dialogButton('Cancelar').click()
    await flushPromises()

    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })

  it('closes the dialogs with Escape', async () => {
    const { wrapper } = await render()
    const escape = () =>
      document
        .querySelector('[role="dialog"]')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    await rowOf(wrapper, 'Conta de luz').findAll('button')[1]!.trigger('click')
    await flushPromises()
    escape()
    await flushPromises()
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()

    await buttonWithText(wrapper, 'Pagar').trigger('click')
    await flushPromises()
    wrapper.getComponent(PayMovementDialog).vm.$emit('close')
    await flushPromises()
    expect(wrapper.getComponent(PayMovementDialog).props('movement')).toBeNull()
  })

  it('closes the closing dialog with Escape', async () => {
    const { wrapper } = await render('/financial/closing', ready, { pendencies: [] })

    await buttonWithText(wrapper, 'Fechar Outubro').trigger('click')
    await flushPromises()
    document
      .querySelector('[role="dialog"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })

  it('pays a pending item with the payment dialog and reloads', async () => {
    const { wrapper } = await render()
    vi.mocked(movementsApi.pay).mockResolvedValue({} as never)

    await buttonWithText(wrapper, 'Pagar').trigger('click')
    const dialog = wrapper.getComponent(PayMovementDialog)
    expect(dialog.props('movement')).toMatchObject({ id: 'm-1', invoicePayment: false })
    dialog.vm.$emit('pay', dialog.props('movement'), { wallet: 'w-1', paidOn: '2026-11-21' })
    await settle()

    expect(movementsApi.pay).toHaveBeenCalledWith('m-1', { wallet: 'w-1', paidOn: '2026-11-21' })
    expect(financialPeriodsApi.findClosing).toHaveBeenCalledTimes(2)
  })

  it('keeps the payment dialog open and shows what the server refuses inside it', async () => {
    const { wrapper } = await render()
    vi.mocked(movementsApi.pay).mockRejectedValue(problem(400, { error: 'invoice-not-open' }))

    await buttonWithText(wrapper, 'Pagar').trigger('click')
    const dialog = wrapper.getComponent(PayMovementDialog)
    dialog.vm.$emit('pay', dialog.props('movement'), { wallet: 'w-1', paidOn: '2026-11-21' })
    await settle()

    expect(dialog.props('movement')).not.toBeNull()
    expect(dialog.props('messages')).toEqual([expect.stringContaining('A fatura não está aberta')])
    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(false)
  })

  it('flags the invoice payment when paying it', async () => {
    const { wrapper } = await render()

    await wrapper
      .findAll('[data-slot="pendencies"] tbody tr')[1]!
      .findAll('button')[0]!
      .trigger('click')

    expect(wrapper.getComponent(PayMovementDialog).props('movement')).toMatchObject({
      id: 'm-2',
      invoicePayment: true,
    })
  })

  it('moves a pending item to the next open period and reloads', async () => {
    const { wrapper } = await render()
    vi.mocked(movementsApi.move).mockResolvedValue({} as never)

    await rowOf(wrapper, 'Conta de luz').findAll('button')[1]!.trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('Mover “Conta de luz”')
    dialogButton('Mover').click()
    await settle()

    expect(movementsApi.move).toHaveBeenCalledWith('m-1', 'p-11')
    expect(toast.success).toHaveBeenCalledWith('Movimento movido', {
      description: '“Conta de luz” foi para Novembro.',
      duration: 4000,
    })
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    expect(financialPeriodsApi.findClosing).toHaveBeenCalledTimes(2)
  })

  it('keeps the move dialog open and shows what the server refuses', async () => {
    const { wrapper } = await render()
    vi.mocked(movementsApi.move).mockRejectedValue(problem(400, { error: 'invoice-payment-moved' }))

    await rowOf(wrapper, 'Conta de luz').findAll('button')[1]!.trigger('click')
    await flushPromises()
    dialogButton('Mover').click()
    await settle()

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
    expect(dialogError()).toContain('Mova-o de volta')
    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(false)

    dialogButton('Cancelar').click()
    await flushPromises()
    await rowOf(wrapper, 'Conta de luz').findAll('button')[1]!.trigger('click')
    await flushPromises()
    expect(dialogError()).toBe('')
  })

  it('cancels the move dialog and does not move without a chosen period', async () => {
    const { wrapper } = await render()

    await rowOf(wrapper, 'Conta de luz').findAll('button')[1]!.trigger('click')
    await flushPromises()
    dialogButton('Cancelar').click()
    await flushPromises()

    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    expect(movementsApi.move).not.toHaveBeenCalled()
  })

  it('marks the expired target periods in the move dialog', async () => {
    const past = { id: 'p-10', name: 'Outubro', startingAt: '2026-10-01', endingAt: '2026-10-31' }
    const { wrapper } = await render('/financial/closing?period=p-11', {
      ...blocked,
      targetPeriods: [past, november],
    })

    await rowOf(wrapper, 'Conta de luz').findAll('button')[1]!.trigger('click')
    await flushPromises()

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
  })

  it('tells there is no open period after this one and disables moving', async () => {
    const { wrapper, router } = await render('/financial/closing', {
      ...blocked,
      nextOpenPeriod: null,
      targetPeriods: [],
    })

    expect(wrapper.find('[data-slot="no-next-period"]').text()).toContain(
      'Não há período aberto depois de Outubro',
    )
    expect(wrapper.find('[data-slot="no-next-period"]').text()).toContain(
      'Pague tudo ou crie um período para mover.',
    )
    expect(wrapper.find('[data-slot="checklist"]').text()).toContain(
      'Não há: pague tudo ou crie um',
    )
    expect(wrapper.find('[data-slot="checklist"]').text()).not.toContain(
      'Não é preciso: nada a mover',
    )
    expect(wrapper.find('[data-slot="checklist"]').findAll('li')[2]!.attributes('data-done')).toBe(
      'false',
    )
    expect(
      wrapper
        .find('[data-slot="pendencies"]')
        .findAll('button')
        .filter((button) => button.text() === 'Mover')
        .every((button) => button.attributes('disabled') !== undefined),
    ).toBe(true)

    await buttonWithText(wrapper, 'Criar período').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('financial-periods.create')
  })

  it('tells moving is not needed when there is no next period and nothing pending', async () => {
    const { wrapper } = await render(
      '/financial/closing',
      { ...ready, nextOpenPeriod: null, targetPeriods: [] },
      { pendencies: [] },
    )

    const nextPeriodItem = wrapper.find('[data-slot="checklist"]').findAll('li')[2]!
    expect(nextPeriodItem.attributes('data-done')).toBe('true')
    expect(nextPeriodItem.text()).toContain('Período seguinte aberto')
    expect(nextPeriodItem.text()).toContain('Não é preciso: nada a mover')
    expect(nextPeriodItem.text()).not.toContain('Não há: pague tudo ou crie um')
  })

  it('offers only creating a period in the alert, never paying everything', async () => {
    const { wrapper } = await render('/financial/closing', {
      ...blocked,
      nextOpenPeriod: null,
      targetPeriods: [],
    })

    const buttons = wrapper
      .find('[data-slot="no-next-period"]')
      .findAll('button')
      .map((button) => button.text())
    expect(buttons).toEqual(['Criar período'])
  })

  it('reads a missing next period the same as a null one', async () => {
    const withoutNext: Partial<ClosingSummaryView> = { ...blocked }
    delete withoutNext.nextOpenPeriod
    const { wrapper } = await render('/financial/closing', withoutNext as ClosingSummaryView)

    expect(wrapper.find('[data-slot="no-next-period"]').exists()).toBe(true)
  })

  it('says there is nothing pending and nothing in the invoices', async () => {
    const { wrapper } = await render('/financial/closing', ready, {
      pendencies: [],
    })

    expect(wrapper.find('[data-slot="no-pendencies"]').text()).toContain('Nenhuma pendência')
    expect(wrapper.find('[data-slot="no-pendencies"]').text()).toContain(
      'Tudo o que estava em aberto foi pago ou movido.',
    )
    expect(wrapper.find('[data-slot="no-invoices"]').text()).toBe(
      'Nenhum cartão ativo neste período.',
    )
  })

  it('closes the period after confirming, tells the result and moves on to the oldest open one', async () => {
    const { wrapper, router } = await render('/financial/closing', ready, {
      pendencies: [],
    })
    vi.mocked(financialPeriodsApi.close).mockResolvedValue({
      revenues: 1000,
      expenses: 400,
      result: 600,
      recorded: true,
      toPay: 0,
      overdueExpenses: 0,
      paidOnCard: 0,
    })

    await buttonWithText(wrapper, 'Fechar Outubro').trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('Fechar Outubro?')
    expect(document.body.textContent).toContain('Grava o resultado e congela o período.')
    expect(document.body.querySelector('[data-slot="close-summary"]')!.textContent).toMatch(
      /Resultado.*600,00/,
    )
    vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(
      pageOf(
        periods.map((period) => (period.id === 'p-10' ? { ...period, status: 'CLOSED' } : period)),
      ),
    )
    dialogButton('Fechar período').click()
    await settle()

    expect(financialPeriodsApi.close).toHaveBeenCalledWith('p-10')
    expect(toast.success).toHaveBeenCalledWith(
      'Outubro encerrado',
      expect.objectContaining({
        description: expect.stringMatching(
          /^Resultado R\$\s600,00 gravado\. Faturas vazias fecharam com valor zero\.$/,
        ),
      }),
    )
    expect(router.currentRoute.value.name).toBe('closing')
    expect(router.currentRoute.value.query.period).toBe('p-11')
    expect(financialPeriodsApi.findClosing).toHaveBeenLastCalledWith('p-11')
    expect(wrapper.find('h1').text()).toBe('Fechamento de Novembro')
    expect(wrapper.find('[data-slot="no-period"]').exists()).toBe(false)
  })

  it('shows the empty state when the last open period is closed', async () => {
    const { wrapper, router } = await render('/financial/closing?period=p-11', ready, {
      pendencies: [],
      list: [periods[0]!, periods[2]!],
    })
    vi.mocked(financialPeriodsApi.close).mockResolvedValue({
      revenues: 0,
      expenses: 0,
      result: 0,
      recorded: true,
      toPay: 0,
      overdueExpenses: 0,
      paidOnCard: 0,
    })
    vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(
      pageOf(periods.map((period) => ({ ...period, status: 'CLOSED' }))),
    )

    await buttonWithText(wrapper, 'Fechar Novembro').trigger('click')
    await flushPromises()
    dialogButton('Fechar período').click()
    await settle()

    expect(wrapper.find('h1').text()).toBe('Fechamento')
    expect(router.currentRoute.value.query.period).toBeUndefined()
    expect(wrapper.find('[data-slot="no-period"]').text()).toContain('Nenhum período para fechar')
    expect(wrapper.find('[data-slot="no-period"]').text()).toContain(
      'Todos os períodos estão encerrados.',
    )
    expect(wrapper.find('[data-slot="checklist"]').exists()).toBe(false)
    expect(wrapper.find('[data-slot="summary"]').exists()).toBe(false)
    expect(wrapper.find('[data-slot="pendencies"]').exists()).toBe(false)
    expect(wrapper.find('[data-slot="invoices"]').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'FilterSelect' }).exists()).toBe(true)
  })

  it('signs a negative result in the toast', async () => {
    const { wrapper } = await render('/financial/closing', ready, { pendencies: [] })
    vi.mocked(financialPeriodsApi.close).mockResolvedValue({
      revenues: 100,
      expenses: 400,
      result: -300,
      recorded: true,
      toPay: 0,
      overdueExpenses: 0,
      paidOnCard: 0,
    })

    await buttonWithText(wrapper, 'Fechar Outubro').trigger('click')
    await flushPromises()
    dialogButton('Fechar período').click()
    await settle()

    expect(toast.success).toHaveBeenCalledWith(
      'Outubro encerrado',
      expect.objectContaining({ description: expect.stringMatching(/−R\$\s300,00/) }),
    )
  })

  it('keeps the dialog open when the server refuses to close and lets the user back out', async () => {
    const { wrapper } = await render('/financial/closing', ready, { pendencies: [] })
    vi.mocked(financialPeriodsApi.close).mockRejectedValue(
      problem(400, { error: 'financial-period-with-open-movements' }),
    )

    await buttonWithText(wrapper, 'Fechar Outubro').trigger('click')
    await flushPromises()
    dialogButton('Fechar período').click()
    await settle()
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
    expect(dialogError()).toContain('O período ainda tem movimentos em aberto')
    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(false)
    dialogButton('Cancelar').click()
    await flushPromises()
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()

    await buttonWithText(wrapper, 'Fechar Outubro').trigger('click')
    await flushPromises()
    expect(dialogError()).toBe('')
  })

  it('follows the period of the URL when it changes from outside', async () => {
    const { wrapper, router } = await render()

    await router.push('/financial/closing?period=p-11')
    await settle()

    expect(wrapper.find('h1').text()).toBe('Fechamento de Novembro')
    expect(financialPeriodsApi.findClosing).toHaveBeenLastCalledWith('p-11')

    await router.push('/financial/closing?period=p-11')
    await router.push('/financial/closing?period=p-09')
    await settle()
    expect(wrapper.find('h1').text()).toBe('Fechamento de Novembro')
  })

  it('changes the period from the selector', async () => {
    const { wrapper, router } = await render()

    wrapper.findComponent({ name: 'FilterSelect' }).vm.$emit('update:modelValue', 'p-11')
    await settle()

    expect(router.currentRoute.value.query.period).toBe('p-11')
    expect(wrapper.find('h1').text()).toBe('Fechamento de Novembro')

    wrapper.findComponent({ name: 'FilterSelect' }).vm.$emit('update:modelValue', '')
    await settle()
    expect(wrapper.find('h1').text()).toBe('Fechamento')
  })

  it('shows the empty state and loads nothing when no period is open', async () => {
    const { wrapper, router } = await render('/financial/closing', blocked, { list: [periods[2]!] })

    expect(wrapper.find('h1').text()).toBe('Fechamento')
    expect(financialPeriodsApi.findClosing).not.toHaveBeenCalled()
    expect(wrapper.find('[data-slot="no-period"]').text()).toContain('Nenhum período para fechar')
    expect(wrapper.find('[data-slot="checklist"]').exists()).toBe(false)

    await buttonWithText(wrapper, 'Criar período').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('financial-periods.create')
  })

  it('does not flash the empty state while the periods are loading or when they fail', async () => {
    serve()
    vi.mocked(financialPeriodsApi.findAll).mockRejectedValue(problem(500))
    const { router, plugins } = createTestPlugins({
      routes: [
        ...crudTestRoutes('financial-periods'),
        { path: '/financial/closing', name: 'closing', component: PeriodClosingView },
      ],
      stubActions: false,
      initialState: {},
    })
    await router.push('/financial/closing')
    const wrapper = mount(PeriodClosingView, { attachTo: document.body, global: { plugins } })
    await settle()

    expect(wrapper.find('[data-slot="no-period"]').exists()).toBe(false)
    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
  })

  it('shows the error when the closing information cannot be loaded', async () => {
    serve()
    vi.mocked(financialPeriodsApi.findClosing).mockRejectedValue(problem(500))
    const { router, plugins } = createTestPlugins({
      routes: [
        ...crudTestRoutes('financial-periods'),
        { path: '/financial/closing', name: 'closing', component: PeriodClosingView },
        {
          path: '/financial/movements/:id/detail',
          name: 'movements.detail',
          component: PeriodClosingView,
        },
      ],
      stubActions: false,
      initialState: {},
    })
    await router.push('/financial/closing')
    const wrapper = mount(PeriodClosingView, { attachTo: document.body, global: { plugins } })
    await settle()

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-slot="summary"]').exists()).toBe(false)
  })
})
