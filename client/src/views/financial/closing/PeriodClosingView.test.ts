import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { cardPurchasesApi } from '@/api/cardPurchases'
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
  FinancialPeriodListView,
  InvoiceView,
  MovementListView,
} from '@/types'
import PeriodClosingView from '@/views/financial/closing/PeriodClosingView.vue'

vi.mock('@/api/cardPurchases')
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
  },
  {
    id: 'p-10',
    name: 'Outubro',
    startingAt: '2026-10-01',
    endingAt: '2026-10-31',
    status: 'OPEN',
    expired: true,
  },
  {
    id: 'p-09',
    name: 'Setembro',
    startingAt: '2026-09-01',
    endingAt: '2026-09-30',
    status: 'CLOSED',
    expired: false,
  },
] as FinancialPeriodListView[]

const november = { id: 'p-11', name: 'Novembro', startingAt: '2026-11-01', endingAt: '2026-11-30' }

const blocked: ClosingSummaryView = {
  openMovements: { count: 2, income: 0, expense: 150 },
  openInvoices: [{ id: 'i-1', card: { id: 'k-1', name: 'Visa' }, value: 300 }],
  emptyInvoices: [{ id: 'i-2', card: { id: 'k-2', name: 'Elo' }, value: 0 }],
  nextOpenPeriod: november,
  targetPeriods: [november],
  canClose: false,
}

const ready: ClosingSummaryView = {
  openMovements: { count: 0, income: 0, expense: 0 },
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
  },
  {
    id: 'm-2',
    name: 'Fatura Master',
    type: 'EXPENSE',
    value: 50,
    dueDate: '2026-10-31',
    overdue: false,
  },
  {
    id: 'm-3',
    name: 'Freela',
    type: 'INCOME',
    value: 200,
    dueDate: '2026-10-25',
    overdue: false,
  },
] as MovementListView[]

const invoices = [
  { id: 'i-1', status: 'OPEN', value: 300, card: { id: 'k-1', name: 'Visa' } },
  { id: 'i-2', status: 'OPEN', value: 0, card: { id: 'k-2', name: 'Elo' } },
  { id: 'i-3', status: 'CLOSED', value: 50, card: { id: 'k-3', name: 'Master' } },
  { id: 'i-4', status: 'PAID', value: 80, card: { id: 'k-4', name: 'Nubank' } },
] as InvoiceView[]

function serve(
  summary: ClosingSummaryView = blocked,
  options: {
    pendencies?: MovementListView[]
    invoices?: InvoiceView[]
    list?: typeof periods
  } = {},
) {
  vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf(options.list ?? periods))
  vi.mocked(costCentersApi.findAll).mockResolvedValue(pageOf([]))
  vi.mocked(classificationsApi.findAll).mockResolvedValue(pageOf([]))
  vi.mocked(financialPeriodsApi.findClosing).mockResolvedValue(summary)
  vi.mocked(financialPeriodsApi.findResult).mockResolvedValue({
    revenues: 1000,
    expenses: 400,
    result: 600,
    recorded: false,
    toPay: 0,
    overdueExpenses: 0,
  })
  vi.mocked(periodResultsApi.findAccumulated).mockResolvedValue({
    recorded: 1400,
    provisional: 600,
    accumulated: 2000,
    provisionalPeriods: [],
  })
  vi.mocked(movementsApi.findAll).mockImplementation((query) =>
    Promise.resolve(
      pageOf(query.invoicePayments ? [movements[1]!] : (options.pendencies ?? movements)),
    ),
  )
  vi.mocked(invoicesApi.findAll).mockResolvedValue(pageOf(options.invoices ?? invoices))
  vi.mocked(walletsApi.findAll).mockResolvedValue(pageOf([{ id: 'w-1', name: 'Conta' }] as never[]))
  vi.mocked(cardsApi.findAll).mockResolvedValue(pageOf([]))
  vi.mocked(cardsApi.findById).mockResolvedValue({
    id: 'k-1',
    invoicePaymentDay: 10,
    wallet: { id: 'w-1', name: 'Conta' },
  } as never)
  vi.mocked(cardPurchasesApi.findAll).mockResolvedValue(pageOf([], 3))
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

  it('opens on the open period of today when nothing has expired', async () => {
    const { wrapper } = await render('/financial/closing', blocked, {
      list: periods.map((period) => ({ ...period, expired: false })),
    })

    expect(wrapper.find('h1').text()).toBe('Fechamento de Novembro')
  })

  it('shows the paid revenues and expenses, the result and the accumulated', async () => {
    const { wrapper } = await render()

    const summary = wrapper.find('[data-slot="summary"]').text()
    expect(summary).toContain('Receitas pagas')
    expect(summary).toMatch(/\+\s*R\$\s*1\.000,00/)
    expect(summary).toMatch(/−\s*R\$\s*400,00/)
    expect(summary).toMatch(/\+\s*R\$\s*600,00/)
    expect(summary).toMatch(/\+\s*R\$\s*2\.000,00/)
    expect(summary).toContain('Fechados mais provisório dos abertos')
  })

  it('lists the pending items, marking the overdue and the invoice payment', async () => {
    const { wrapper } = await render()

    const rows = wrapper.find('[data-slot="pendencies"]').findAll('tbody tr')
    expect(rows).toHaveLength(3)
    expect(rows[0]!.attributes('data-state')).toBe('selected')
    expect(rows[0]!.text()).toContain('vencido')
    expect(rows[0]!.text()).toContain('20/10/2026')
    expect(rows[0]!.text()).toMatch(/−\s*R\$\s*100,00/)
    expect(rows[0]!.text()).not.toContain('fatura')
    expect(rows[1]!.text()).toContain('fatura')
    expect(rows[1]!.attributes('data-state')).toBeUndefined()
    expect(rows[2]!.text()).toContain('Receber')
    expect(rows[2]!.text()).toMatch(/\+\s*R\$\s*200,00/)
    expect(movementsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ statuses: ['OPEN'], financialPeriods: ['p-10'] }),
    )
  })

  it('says what blocks the closing and keeps the button off', async () => {
    const { wrapper } = await render()

    const checklist = wrapper.find('[data-slot="checklist"]')
    expect(checklist.findAll('li').map((item) => item.attributes('data-done'))).toEqual([
      'false',
      'false',
      'true',
    ])
    expect(checklist.text()).toContain('Pendências resolvidas')
    expect(checklist.text()).toContain('Faturas resolvidas')
    expect(checklist.text()).toContain('Período seguinte aberto')
    expect(buttonWithText(wrapper, 'Fechar Outubro').attributes('disabled')).toBeDefined()
  })

  it('describes each invoice and offers closing only the one that blocks', async () => {
    const { wrapper } = await render()

    const items = wrapper.find('[data-slot="invoices"]').findAll('li')
    expect(
      items.map(
        (item) => item.attributes('data-note') ?? item.find('[data-note]').attributes('data-note'),
      ),
    ).toEqual(['blocking', 'empty', 'payment', 'paid'])
    expect(items[0]!.text()).toContain('Bloqueia o fechamento')
    expect(items[1]!.text()).toContain('Fecha sozinha com valor zero')
    expect(items[2]!.text()).toContain('Pagamento de fatura nas pendências')
    expect(items[3]!.text()).toContain('Paga')
    expect(
      wrapper.findAll('button').filter((button) => button.text() === 'Fechar fatura'),
    ).toHaveLength(1)
  })

  it('shows an invoice with no note when it is open but neither blocks nor closes by itself', async () => {
    const { wrapper } = await render('/financial/closing', blocked, {
      invoices: [
        { id: 'i-9', status: 'OPEN', value: 10, card: { id: 'k-9', name: 'Outro' } },
      ] as InvoiceView[],
    })

    expect(wrapper.find('[data-slot="invoices"] li [data-note]').exists()).toBe(false)
  })

  it('closes the blocking invoice from a dialog and reloads', async () => {
    const { wrapper } = await render()
    vi.mocked(invoicesApi.close).mockResolvedValue({ ...invoices[0]!, status: 'CLOSED' })

    await buttonWithText(wrapper, 'Fechar fatura').trigger('click')
    await settle()
    expect(document.body.textContent).toContain('Fechar Outubro')
    expect(cardPurchasesApi.findAll).toHaveBeenCalledWith({ invoice: 'i-1', size: 1 })
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
    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
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
    const { wrapper } = await render('/financial/closing', ready, { pendencies: [], invoices: [] })

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
    expect(wrapper.find('[data-slot="server-error"]').text()).toContain('Mova-o de volta')
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

  it('says there is nothing pending and nothing in the invoices', async () => {
    const { wrapper } = await render('/financial/closing', ready, {
      pendencies: [],
      invoices: [],
    })

    expect(wrapper.find('[data-slot="no-pendencies"]').text()).toBe('Nenhuma pendência')
    expect(wrapper.find('[data-slot="no-invoices"]').text()).toBe('Nenhuma fatura neste período')
  })

  it('closes the period after confirming, tells the result and goes to the periods', async () => {
    const { wrapper, router } = await render('/financial/closing', ready, {
      pendencies: [],
      invoices: [],
    })
    vi.mocked(financialPeriodsApi.close).mockResolvedValue({
      revenues: 1000,
      expenses: 400,
      result: 600,
      recorded: true,
      toPay: 0,
      overdueExpenses: 0,
    })

    await buttonWithText(wrapper, 'Fechar Outubro').trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('Fechar Outubro?')
    expect(document.body.textContent).toContain('Grava o resultado e congela o período.')
    expect(document.body.querySelector('[data-slot="close-summary"]')!.textContent).toMatch(
      /Resultado\s*\+\s*R\$\s*600,00/,
    )
    dialogButton('Fechar período').click()
    await settle()

    expect(financialPeriodsApi.close).toHaveBeenCalledWith('p-10')
    expect(toast.success).toHaveBeenCalledWith(
      'Outubro encerrado',
      expect.objectContaining({
        description: expect.stringMatching(
          /^Resultado \+R\$\s600,00 gravado\. Faturas vazias fecharam com valor zero\.$/,
        ),
      }),
    )
    expect(router.currentRoute.value.name).toBe('financial-periods')
  })

  it('signs a negative result in the toast', async () => {
    const { wrapper } = await render('/financial/closing', ready, { pendencies: [], invoices: [] })
    vi.mocked(financialPeriodsApi.close).mockResolvedValue({
      revenues: 100,
      expenses: 400,
      result: -300,
      recorded: true,
      toPay: 0,
      overdueExpenses: 0,
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
    const { wrapper } = await render('/financial/closing', ready, { pendencies: [], invoices: [] })
    vi.mocked(financialPeriodsApi.close).mockRejectedValue(
      problem(400, { error: 'financial-period-with-open-movements' }),
    )

    await buttonWithText(wrapper, 'Fechar Outubro').trigger('click')
    await flushPromises()
    dialogButton('Fechar período').click()
    await settle()
    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'O período ainda tem movimentos em aberto',
    )
    dialogButton('Cancelar').click()
    await flushPromises()

    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
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

  it('shows the title alone and loads nothing when no period is open', async () => {
    const { wrapper } = await render('/financial/closing', blocked, { list: [periods[2]!] })

    expect(wrapper.find('h1').text()).toBe('Fechamento')
    expect(financialPeriodsApi.findClosing).not.toHaveBeenCalled()
    expect(buttonWithText(wrapper, 'Fechar').attributes('disabled')).toBeDefined()
  })

  it('shows the error when the closing information cannot be loaded', async () => {
    serve()
    vi.mocked(financialPeriodsApi.findClosing).mockRejectedValue(problem(500))
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

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-slot="summary"]').exists()).toBe(false)
  })
})
