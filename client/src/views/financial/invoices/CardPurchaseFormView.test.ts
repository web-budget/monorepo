import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { cardPurchasesApi } from '@/api/cardPurchases'
import { cardsApi } from '@/api/cards'
import { classificationsApi } from '@/api/classifications'
import { costCentersApi } from '@/api/costCenters'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { recurringMovementsApi } from '@/api/recurringMovements'
import { invoicesApi } from '@/api/invoices'
import SelectField from '@/components/forms/SelectField.vue'
import { Select } from '@/components/ui/select'
import { mountView, namedTestRoutes, pageOf, problem, settle } from '@/test/crud'
import type {
  CardListView,
  CardPurchaseView,
  ClassificationListView,
  CostCenterListView,
  FinancialPeriodListView,
  InvoiceView,
} from '@/types'
import CardPurchaseFormView from '@/views/financial/invoices/CardPurchaseFormView.vue'

vi.mock('@/api/cardPurchases')
vi.mock('@/api/cards')
vi.mock('@/api/financialPeriods')
vi.mock('@/api/costCenters')
vi.mock('@/api/classifications')
vi.mock('@/api/recurringMovements')
vi.mock('@/api/invoices')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

type Wrapper = Awaited<ReturnType<typeof mountView>>['wrapper']

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

const existing: CardPurchaseView = {
  id: 'cp-1',
  name: 'Mercado',
  purchasedOn: '2026-11-02',
  value: 300,
  card: { id: 'c-1', name: 'Visa Platinum', lastFourDigits: '4821' },
  invoice: { id: 'i-1', status: 'OPEN' },
  financialPeriod: { id: 'p-09', name: 'Setembro', status: 'CLOSED', expired: false },
  classification: { id: 'cl-1', name: 'Mercado', type: 'EXPENSE' },
  costCenter: { id: 'cc-1', name: 'Casa', fullName: 'Casa' },
  movement: null,
}

function serve() {
  vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf(periods))
  vi.mocked(cardsApi.findAll).mockResolvedValue(
    pageOf([
      { id: 'c-1', name: 'Visa Platinum', lastFourDigits: '4821' },
      { id: 'c-2', name: 'Master', lastFourDigits: '1177' },
    ] as CardListView[]),
  )
  vi.mocked(costCentersApi.findAll).mockResolvedValue(
    pageOf([{ id: 'cc-1', name: 'Casa', fullName: 'Casa' }] as CostCenterListView[]),
  )
  vi.mocked(classificationsApi.findAll).mockResolvedValue(
    pageOf([
      { id: 'cl-1', name: 'Mercado', type: 'EXPENSE', active: true },
      { id: 'cl-2', name: 'Salário', type: 'INCOME', active: true },
    ] as ClassificationListView[]),
  )
  vi.mocked(invoicesApi.findAll).mockResolvedValue(pageOf([{ id: 'i-1' }] as InvoiceView[]))
}

async function render(props: Record<string, unknown> = {}, location?: string) {
  serve()
  return mountView(
    CardPurchaseFormView,
    'purchases',
    props,
    {},
    location,
    namedTestRoutes('invoices.detail'),
  )
}

function field(wrapper: Wrapper, name: string) {
  return wrapper.find(`[name="${name}"]`)
}

function selects(wrapper: Wrapper) {
  return wrapper.findAllComponents(Select)
}

function options(wrapper: Wrapper, index: number) {
  return wrapper.findAllComponents(SelectField)[index]!.props('options')
}

async function submit(wrapper: Wrapper) {
  await wrapper.find('form').trigger('submit')
  await settle()
}

async function fill(wrapper: Wrapper) {
  await field(wrapper, 'name').setValue('Mercado')
  await field(wrapper, 'value').setValue('30000')
  selects(wrapper)[2]!.vm.$emit('update:modelValue', 'cc-1')
  selects(wrapper)[3]!.vm.$emit('update:modelValue', 'cl-1')
  await flushPromises()
}

describe('CardPurchaseFormView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 21))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the title, the sections, the examples and the helps, and asks for the required fields', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Nova compra no cartão')
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual([
      'Cartão e período',
      'Compra',
      'Parcelamento',
    ])
    expect(wrapper.text()).toContain('Compra parcelada vira um recorrente.')
    expect(wrapper.find('button[type="submit"]').text()).toBe('Lançar compra')
    expect(field(wrapper, 'name').attributes('placeholder')).toBe('Ex.: Mercado do bairro')
    expect(wrapper.text()).toContain('Só períodos abertos.')
    expect(wrapper.text()).toContain('Só classificações de despesa.')
    expect(wrapper.findAll('label').filter((label) => label.text().endsWith('*'))).toHaveLength(7)
    expect(wrapper.text()).not.toContain('Alterações não salvas')

    await submit(wrapper)

    expect(wrapper.text()).toContain('Campo obrigatório')
    expect(cardPurchasesApi.create).not.toHaveBeenCalled()
  })

  it('starts on the first active card and on the period that contains today, with the date of today', async () => {
    const { wrapper } = await render()

    expect(selects(wrapper)[0]!.props('modelValue')).toBe('c-1')
    expect(selects(wrapper)[1]!.props('modelValue')).toBe('p-11')
    expect((field(wrapper, 'purchasedOn').element as HTMLInputElement).value).toBe('2026-11-21')
  })

  it('lists the cards with their last digits and the open periods, saying which expired', async () => {
    const { wrapper } = await render()

    expect(options(wrapper, 0)).toEqual([
      { value: 'c-1', label: 'Visa Platinum ••4821' },
      { value: 'c-2', label: 'Master ••1177' },
    ])
    expect(options(wrapper, 1)).toEqual([
      { value: 'p-11', label: 'Novembro' },
      { value: 'p-10', label: 'Outubro · expirado' },
    ])
  })

  it('posts the purchase and stays on the cleared form, which keeps the card and the period', async () => {
    vi.mocked(cardPurchasesApi.create).mockResolvedValue('cp-9')
    const { wrapper, router } = await render()

    await fill(wrapper)
    await submit(wrapper)

    expect(cardPurchasesApi.create).toHaveBeenCalledWith({
      name: 'Mercado',
      purchasedOn: '2026-11-21',
      value: 300,
      card: 'c-1',
      financialPeriod: 'p-11',
      classification: 'cl-1',
      costCenter: 'cc-1',
    })
    expect(toast.success).toHaveBeenCalledWith('Compra lançada', {
      description: 'Entrou na fatura aberta do cartão.',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).not.toBe('purchases.detail')
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('')
    expect(selects(wrapper)[0]!.props('modelValue')).toBe('c-1')
    expect(selects(wrapper)[1]!.props('modelValue')).toBe('p-11')
  })

  it('shows the installments, the value of each one and how they enter when the key is on', async () => {
    const { wrapper } = await render()
    expect(field(wrapper, 'installments').exists()).toBe(false)
    expect(wrapper.find('[data-slot="installment-notice"]').exists()).toBe(false)

    await wrapper.find('button[role="switch"]').trigger('click')

    expect((field(wrapper, 'installments').element as HTMLInputElement).value).toBe('12')
    expect(field(wrapper, 'installmentValue').exists()).toBe(true)
    const notice = wrapper.find('[data-slot="installment-notice"]')
    expect(notice.text()).toContain('Como a parcela entra')
    expect(notice.text()).toContain(
      'Cria um recorrente: cada parcela entra como movimento em aberto e vai para a fatura quando paga no cartão.',
    )
    expect(notice.find('a').attributes('href')).toBe('/financial/recurring-movements/launch')
    expect(notice.find('a').text()).toBe('Lançar a primeira parcela')
    expect(wrapper.find('button[type="submit"]').text()).toBe('Criar parcelamento')
  })

  it('creates the recurring movement on the card, without asking for the value of the purchase', async () => {
    vi.mocked(recurringMovementsApi.create).mockResolvedValue('r-9')
    const { wrapper, router } = await render()
    selects(wrapper)[0]!.vm.$emit('update:modelValue', 'c-1')
    await field(wrapper, 'name').setValue('Notebook')
    selects(wrapper)[2]!.vm.$emit('update:modelValue', 'cc-1')
    selects(wrapper)[3]!.vm.$emit('update:modelValue', 'cl-1')
    await wrapper.find('button[role="switch"]').trigger('click')
    await field(wrapper, 'installments').setValue('6')
    await field(wrapper, 'installmentValue').setValue('24990')

    await submit(wrapper)

    expect(cardPurchasesApi.create).not.toHaveBeenCalled()
    expect(recurringMovementsApi.create).toHaveBeenCalledWith({
      name: 'Notebook',
      type: 'EXPENSE',
      valueKind: 'FIXED',
      value: 249.9,
      installments: 6,
      firstInstallment: 1,
      autoLaunch: true,
      classification: 'cl-1',
      costCenter: 'cc-1',
      card: 'c-1',
    })
    expect(toast.success).toHaveBeenCalledWith('Parcelamento criado', {
      description: 'Entra sozinho no próximo período.',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).not.toBe('purchases.detail')
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('')
  })

  it('asks for the installments and the value of each one', async () => {
    const { wrapper } = await render()
    selects(wrapper)[0]!.vm.$emit('update:modelValue', 'c-1')
    await field(wrapper, 'name').setValue('Notebook')
    selects(wrapper)[2]!.vm.$emit('update:modelValue', 'cc-1')
    selects(wrapper)[3]!.vm.$emit('update:modelValue', 'cl-1')
    await wrapper.find('button[role="switch"]').trigger('click')
    await field(wrapper, 'installments').setValue('1')

    await submit(wrapper)

    expect(recurringMovementsApi.create).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Campo obrigatório')
  })

  it('requires the date of the purchase', async () => {
    const { wrapper } = await render()

    await fill(wrapper)
    await field(wrapper, 'purchasedOn').setValue('')
    await submit(wrapper)

    expect(cardPurchasesApi.create).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Campo obrigatório')
  })

  it('starts from the card and the period of the link', async () => {
    vi.mocked(cardPurchasesApi.create).mockResolvedValue('cp-9')
    const { wrapper } = await render({}, '/purchases/create?card=c-2&period=p-10')

    expect(selects(wrapper)[0]!.props('modelValue')).toBe('c-2')
    expect(selects(wrapper)[1]!.props('modelValue')).toBe('p-10')
    await fill(wrapper)
    await submit(wrapper)

    expect(cardPurchasesApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ card: 'c-2', financialPeriod: 'p-10' }),
    )
  })

  it('falls back to the first card and the current period when the link points to something unavailable', async () => {
    const { wrapper } = await render({}, '/purchases/create?card=zzz&period=p-09')

    expect(selects(wrapper)[0]!.props('modelValue')).toBe('c-1')
    expect(selects(wrapper)[1]!.props('modelValue')).toBe('p-11')
  })

  it('starts empty when there is no active card and no open period', async () => {
    serve()
    vi.mocked(cardsApi.findAll).mockResolvedValue(pageOf([]))
    vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf([]))

    const { wrapper } = await mountView(CardPurchaseFormView, 'purchases')

    expect(selects(wrapper)[0]!.props('modelValue')).toBeUndefined()
    expect(selects(wrapper)[1]!.props('modelValue')).toBeUndefined()
  })

  it('warns that the invoice is closed and links to it, since nothing is posted', async () => {
    serve()
    vi.mocked(invoicesApi.findAll)
      .mockResolvedValueOnce(pageOf([]))
      .mockResolvedValue(pageOf([{ id: 'i-9' }] as InvoiceView[]))
    const { wrapper } = await mountView(
      CardPurchaseFormView,
      'purchases',
      {},
      {},
      undefined,
      namedTestRoutes('invoices.detail'),
    )
    await settle()

    const alert = wrapper.find('[data-slot="no-open-invoice"]')
    expect(alert.text()).toContain('A fatura de Novembro do Visa Platinum está fechada')
    expect(alert.text()).toContain('Nada foi lançado.')
    expect(alert.find('a').text()).toBe('Ver a fatura')
    expect(alert.find('a').attributes('href')).toBe('/__invoices.detail/i-9')
  })

  it('warns that there is no open invoice, without a link, when the card has none in the period', async () => {
    serve()
    vi.mocked(invoicesApi.findAll).mockResolvedValue(pageOf([]))
    const { wrapper } = await mountView(CardPurchaseFormView, 'purchases')
    await settle()

    const alert = wrapper.find('[data-slot="no-open-invoice"]')
    expect(alert.text()).toContain('Não há fatura aberta de Visa Platinum em Novembro')
    expect(alert.find('a').exists()).toBe(false)
  })

  it('says when there is no open invoice for the card in the period', async () => {
    vi.mocked(cardPurchasesApi.create).mockRejectedValue(problem(400, { error: 'no-open-invoice' }))
    const { wrapper, router } = await render()

    await fill(wrapper)
    await submit(wrapper)

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain('Nada foi lançado')
    expect(router.currentRoute.value.name).not.toBe('purchases.detail')
  })

  it('shows the server error when the options cannot be loaded', async () => {
    serve()
    vi.mocked(cardsApi.findAll).mockRejectedValue(problem(500))

    const { wrapper } = await mountView(CardPurchaseFormView, 'purchases')

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
  })

  it('loads a purchase for editing with the card and the period locked, and saves it', async () => {
    vi.mocked(cardPurchasesApi.findById).mockResolvedValue(existing)
    vi.mocked(cardPurchasesApi.update).mockResolvedValue(existing)
    const { wrapper, router } = await render({ id: 'cp-1' })

    expect(wrapper.find('h1').text()).toBe('Editar compra')
    expect(wrapper.findAll('h2').map((title) => title.text())).not.toContain('Parcelamento')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe('Mercado')
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('Mercado')
    expect(wrapper.find('button[type="submit"]').text()).toBe('Salvar')
    expect(selects(wrapper)[0]!.props('disabled')).toBe(true)
    expect(selects(wrapper)[1]!.props('disabled')).toBe(true)
    expect(options(wrapper, 1).map((option) => option.label)).toContain('Setembro')
    expect(wrapper.find('[data-slot="no-open-invoice"]').exists()).toBe(false)

    await field(wrapper, 'name').setValue('Mercado do bairro')
    await submit(wrapper)

    expect(cardPurchasesApi.update).toHaveBeenCalledWith('cp-1', {
      name: 'Mercado do bairro',
      purchasedOn: '2026-11-02',
      value: 300,
      classification: 'cl-1',
      costCenter: 'cc-1',
    })
    expect(toast.success).toHaveBeenCalledWith('Alterações salvas', expect.anything())
    expect(router.currentRoute.value.name).toBe('purchases.detail')
  })
})
