import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { cardPurchasesApi } from '@/api/cardPurchases'
import { cardsApi } from '@/api/cards'
import { classificationsApi } from '@/api/classifications'
import { costCentersApi } from '@/api/costCenters'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { Select } from '@/components/ui/select'
import { mountView, pageOf, problem, settle } from '@/test/crud'
import type {
  CardPurchaseView,
  ClassificationListView,
  CostCenterListView,
  FinancialPeriodListView,
} from '@/types'
import CardPurchaseFormView from '@/views/financial/invoices/CardPurchaseFormView.vue'

vi.mock('@/api/cardPurchases')
vi.mock('@/api/cards')
vi.mock('@/api/financialPeriods')
vi.mock('@/api/costCenters')
vi.mock('@/api/classifications')
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
  },
  { id: 'p-10', name: 'Outubro', startingAt: '2026-10-01', endingAt: '2026-10-31', status: 'OPEN' },
  {
    id: 'p-09',
    name: 'Setembro',
    startingAt: '2026-09-01',
    endingAt: '2026-09-30',
    status: 'CLOSED',
  },
] as FinancialPeriodListView[]

const existing: CardPurchaseView = {
  id: 'cp-1',
  name: 'Mercado',
  purchasedOn: '2026-11-02',
  value: 300,
  card: { id: 'c-1', name: 'Visa Platinum' },
  invoice: { id: 'i-1', status: 'OPEN' },
  financialPeriod: { id: 'p-09', name: 'Setembro', status: 'CLOSED', expired: false },
  classification: { id: 'cl-1', name: 'Mercado', type: 'EXPENSE' },
  costCenter: { id: 'cc-1', name: 'Casa', fullName: 'Casa' },
  movement: null,
}

function serve() {
  vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf(periods))
  vi.mocked(cardsApi.findAll).mockResolvedValue(
    pageOf([{ id: 'c-1', name: 'Visa Platinum' }] as never[]),
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
}

async function render(props: Record<string, unknown> = {}, location?: string) {
  serve()
  return mountView(CardPurchaseFormView, 'purchases', props, {}, location)
}

function field(wrapper: Wrapper, name: string) {
  return wrapper.find(`[name="${name}"]`)
}

function selects(wrapper: Wrapper) {
  return wrapper.findAllComponents(Select)
}

async function submit(wrapper: Wrapper) {
  await wrapper.find('form').trigger('submit')
  await settle()
}

async function fill(wrapper: Wrapper) {
  selects(wrapper)[0]!.vm.$emit('update:modelValue', 'c-1')
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

  it('shows the title and the sections and asks for the required fields', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Lançando compra')
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual([
      'Cartão e período',
      'Compra',
    ])
    expect(wrapper.find('button[type="submit"]').text()).toBe('Lançar compra')

    await submit(wrapper)

    expect(wrapper.text()).toContain('Campo obrigatório')
    expect(cardPurchasesApi.create).not.toHaveBeenCalled()
  })

  it('posts the purchase in the period that contains today and stays on the cleared form', async () => {
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
    expect(toast.success).toHaveBeenCalledWith('Compra lançada', expect.anything())
    expect(router.currentRoute.value.name).not.toBe('purchases.detail')
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('')
  })

  it('starts from the card and the period of the link, ignoring what is not available', async () => {
    vi.mocked(cardPurchasesApi.create).mockResolvedValue('cp-9')
    const { wrapper } = await render({}, '/purchases/create?card=c-1&period=p-10')

    await fill(wrapper)
    selects(wrapper)[0]!.vm.$emit('update:modelValue', 'c-1')
    await submit(wrapper)

    expect(cardPurchasesApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ card: 'c-1', financialPeriod: 'p-10' }),
    )
  })

  it('leaves the card empty when the card of the link is not an active one', async () => {
    const { wrapper } = await render({}, '/purchases/create?card=zzz&period=p-09')

    await field(wrapper, 'name').setValue('Mercado')
    await submit(wrapper)

    expect(cardPurchasesApi.create).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Campo obrigatório')
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

    expect(wrapper.find('h1').text()).toBe('Editando compra')
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('Mercado')
    expect(wrapper.find('button[type="submit"]').text()).toBe('Salvar')
    expect(selects(wrapper)[0]!.props('disabled')).toBe(true)
    expect(selects(wrapper)[1]!.props('disabled')).toBe(true)

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
