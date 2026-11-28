import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { cardsApi } from '@/api/cards'
import { classificationsApi } from '@/api/classifications'
import { costCentersApi } from '@/api/costCenters'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { invoicesApi } from '@/api/invoices'
import { movementsApi } from '@/api/movements'
import { walletsApi } from '@/api/wallets'
import SegmentedField from '@/components/forms/SegmentedField.vue'
import SelectField from '@/components/forms/SelectField.vue'
import { Select } from '@/components/ui/select'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { mountView, pageOf, problem, settle } from '@/test/crud'
import type {
  ClassificationListView,
  CostCenterListView,
  FinancialPeriodListView,
  MovementView,
} from '@/types'
import MovementFormView from '@/views/financial/movements/MovementFormView.vue'

vi.mock('@/api/movements')
vi.mock('@/api/financialPeriods')
vi.mock('@/api/costCenters')
vi.mock('@/api/classifications')
vi.mock('@/api/wallets')
vi.mock('@/api/cards')
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

const existing: MovementView = {
  id: 'm-1',
  name: 'Conta de água',
  type: 'EXPENSE',
  value: 96.12,
  dueDate: '2026-11-20',
  status: 'OPEN',
  overdue: false,
  classification: { id: 'cl-1', name: 'Moradia', type: 'EXPENSE' },
  costCenter: { id: 'cc-1', name: 'Casa', fullName: 'Casa' },
  financialPeriod: { id: 'p-10', name: 'Outubro', status: 'OPEN', expired: true },
  description: 'Mensal',
  payment: null,
}

function field(wrapper: Wrapper, name: string) {
  return wrapper.find(`[name="${name}"]`)
}

function selects(wrapper: Wrapper) {
  return wrapper.findAllComponents(Select)
}

function optionsOf(wrapper: Wrapper, index: number) {
  return wrapper.findAllComponents(SelectField)[index]!.props('options')
}

function segmented(wrapper: Wrapper, name: string) {
  return wrapper
    .findAllComponents(SegmentedField)
    .find((component) => component.props('name') === name)!
}

async function choose(wrapper: Wrapper, name: string, label: string) {
  const button = segmented(wrapper, name)
    .findAll('button')
    .find((candidate) => candidate.text() === label)!
  await button.trigger('click')
  await settle()
}

async function submit(wrapper: Wrapper) {
  await wrapper.find('form').trigger('submit')
  await settle()
}

function serve(content = periods) {
  vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf(content))
  vi.mocked(costCentersApi.findAll).mockResolvedValue(
    pageOf([{ id: 'cc-1', name: 'Casa', fullName: 'Casa' }] as CostCenterListView[]),
  )
  vi.mocked(classificationsApi.findAll).mockResolvedValue(
    pageOf([
      { id: 'cl-1', name: 'Moradia', type: 'EXPENSE', active: true },
      { id: 'cl-2', name: 'Salário', type: 'INCOME', active: true },
    ] as ClassificationListView[]),
  )
  vi.mocked(walletsApi.findAll).mockResolvedValue(
    pageOf([
      { id: 'w-1', name: 'Conta corrente', currentBalance: 1234.5 },
      { id: 'w-2', name: 'Poupança', currentBalance: -10 },
    ] as never[]),
  )
  vi.mocked(cardsApi.findAll).mockResolvedValue(
    pageOf([{ id: 'k-1', name: 'Visa Platinum' }] as never[]),
  )
  vi.mocked(invoicesApi.findAll).mockResolvedValue(pageOf([{ id: 'i-1' }] as never[]))
}

async function render(id?: string, content = periods) {
  serve(content)
  return mountView(MovementFormView, 'movements', id ? { id } : {})
}

async function fillBasics(wrapper: Wrapper) {
  await field(wrapper, 'name').setValue('Conta de água')
  await field(wrapper, 'value').setValue('9612')
  selects(wrapper)[1]!.vm.$emit('update:modelValue', 'cc-1')
  selects(wrapper)[2]!.vm.$emit('update:modelValue', 'cl-1')
}

async function turnOnPaid(wrapper: Wrapper) {
  await wrapper.find('button[role="switch"]').trigger('click')
  await settle()
}

describe('MovementFormView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 21))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the title, the sections and asks for the required fields', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Novo movimento')
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual([
      'Tipo',
      'Identificação',
      'Classificação',
      'Pagamento',
    ])
    expect(wrapper.find('button[type="submit"]').text()).toBe('Lançar')

    await submit(wrapper)

    expect(wrapper.text()).toContain('Campo obrigatório')
    expect(movementsApi.create).not.toHaveBeenCalled()
  })

  it('does not ask about unsaved changes just from opening the form', async () => {
    const { router } = await render()

    await router.push('/movements')
    await settle()

    expect(useConfirmDialog().state.open).toBe(false)
    expect(router.currentRoute.value.name).toBe('movements')
  })

  it('offers the type as a segmented field with expense chosen', async () => {
    const { wrapper } = await render()

    const type = segmented(wrapper, 'type')
    expect(type.findAll('button').map((button) => button.text())).toEqual(['Despesa', 'Receita'])
    expect(type.findAll('button').map((button) => button.attributes('aria-pressed'))).toEqual([
      'true',
      'false',
    ])
  })

  it('shows examples as placeholders and the help of the value', async () => {
    const { wrapper } = await render()

    expect(field(wrapper, 'name').attributes('placeholder')).toBe('Ex.: Conta de água')
    expect(wrapper.text()).toContain('Maior que zero.')
    expect(wrapper.text()).toContain('Opcional. Vazio vale hoje.')
    expect(wrapper.text()).toContain('Só períodos abertos.')
    expect(wrapper.text()).toContain('Só aparecem classificações de despesa.')
    expect(field(wrapper, 'description').exists()).toBe(false)
  })

  it('changes the example, the help and the classifications when the type is income', async () => {
    const { wrapper } = await render()

    await choose(wrapper, 'type', 'Receita')

    expect(field(wrapper, 'name').attributes('placeholder')).toBe('Ex.: Salário de dezembro')
    expect(wrapper.text()).toContain('Só aparecem classificações de receita.')
    expect(optionsOf(wrapper, 2)).toEqual([{ value: 'cl-2', label: 'Salário' }])
  })

  it('lists only the open periods, marking the expired one', async () => {
    const { wrapper } = await render()

    expect(optionsOf(wrapper, 0)).toEqual([
      { value: 'p-11', label: 'Novembro' },
      { value: 'p-10', label: 'Outubro · expirado' },
    ])
  })

  it('posts a movement in the period that contains today and stays on the cleared form', async () => {
    vi.mocked(movementsApi.create).mockResolvedValue('m-9')
    const { wrapper, router } = await render()

    await fillBasics(wrapper)
    await field(wrapper, 'dueDate').setValue('2026-11-25')
    await submit(wrapper)

    expect(movementsApi.create).toHaveBeenCalledWith({
      name: 'Conta de água',
      type: 'EXPENSE',
      value: 96.12,
      dueDate: '2026-11-25',
      financialPeriod: 'p-11',
      costCenter: 'cc-1',
      classification: 'cl-1',
      description: null,
      payment: null,
    })
    expect(toast.success).toHaveBeenCalledWith('Movimento lançado', {
      description: 'Ele aparece em aberto no período.',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).not.toBe('movements.detail')
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('')
    expect(selects(wrapper)[0]!.props('modelValue')).toBe('p-11')
  })

  it('posts an income of the chosen period', async () => {
    vi.mocked(movementsApi.create).mockResolvedValue('m-9')
    const { wrapper } = await render()

    await choose(wrapper, 'type', 'Receita')
    selects(wrapper)[0]!.vm.$emit('update:modelValue', 'p-10')
    await field(wrapper, 'name').setValue('Salário')
    await field(wrapper, 'value').setValue('840000')
    selects(wrapper)[1]!.vm.$emit('update:modelValue', 'cc-1')
    selects(wrapper)[2]!.vm.$emit('update:modelValue', 'cl-2')
    await submit(wrapper)

    expect(movementsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'INCOME',
        value: 8400,
        financialPeriod: 'p-10',
        classification: 'cl-2',
        dueDate: null,
      }),
    )
  })

  it('keeps the period empty when there is no open period', async () => {
    const { wrapper } = await render(undefined, [periods[2]!])

    await fillBasics(wrapper)
    await submit(wrapper)

    expect(movementsApi.create).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Campo obrigatório')
  })

  it('opens with no wallet and no card when there are none', async () => {
    serve()
    vi.mocked(walletsApi.findAll).mockResolvedValue(pageOf([]))
    vi.mocked(cardsApi.findAll).mockResolvedValue(pageOf([]))
    const { wrapper } = await mountView(MovementFormView, 'movements')

    await turnOnPaid(wrapper)
    await fillBasics(wrapper)
    await submit(wrapper)

    expect(movementsApi.create).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Campo obrigatório')
  })

  it('posts an already paid movement with the preselected wallet and the discount', async () => {
    vi.mocked(movementsApi.create).mockResolvedValue('m-9')
    const { wrapper } = await render()

    expect(field(wrapper, 'wallet').exists()).toBe(false)
    await turnOnPaid(wrapper)
    expect(wrapper.find('button[type="submit"]').text()).toBe('Lançar e pagar')

    await fillBasics(wrapper)
    await field(wrapper, 'discount').setValue('1000')
    await submit(wrapper)

    expect(movementsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payment: { wallet: 'w-1', paidOn: '2026-11-21', discount: 10 },
      }),
    )
    expect(toast.success).toHaveBeenCalledWith('Movimento lançado', {
      description: 'Lançado já pago, com o pagamento registrado.',
      duration: 4000,
    })
  })

  it('shows the balance of each wallet in its option', async () => {
    const { wrapper } = await render()

    await turnOnPaid(wrapper)

    expect(optionsOf(wrapper, 3)).toEqual([
      { value: 'w-1', label: expect.stringMatching(/^Conta corrente · saldo R\$\s1\.234,50$/) },
      { value: 'w-2', label: expect.stringMatching(/^Poupança · saldo −R\$\s10,00$/) },
    ])
    expect(selects(wrapper)[3]!.props('modelValue')).toBe('w-1')
  })

  it('asks for the wallet of an already paid movement', async () => {
    const { wrapper } = await render()

    await turnOnPaid(wrapper)
    await fillBasics(wrapper)
    selects(wrapper)[3]!.vm.$emit('update:modelValue', '')
    await submit(wrapper)

    expect(movementsApi.create).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Campo obrigatório')
  })

  it('refuses a discount as big as the value', async () => {
    const { wrapper } = await render()

    await turnOnPaid(wrapper)
    await fillBasics(wrapper)
    await field(wrapper, 'discount').setValue('9612')
    await submit(wrapper)

    expect(movementsApi.create).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('O desconto precisa ser menor que o valor.')
  })

  it('asks for the date of an already paid movement', async () => {
    const { wrapper } = await render()

    await turnOnPaid(wrapper)
    await fillBasics(wrapper)
    await field(wrapper, 'paidOn').setValue('')
    await submit(wrapper)

    expect(movementsApi.create).not.toHaveBeenCalled()
  })

  it('offers to pay by wallet or card only for an expense', async () => {
    const { wrapper } = await render()

    await turnOnPaid(wrapper)
    expect(
      segmented(wrapper, 'via')
        .findAll('button')
        .map((button) => button.text()),
    ).toEqual(['Carteira', 'Cartão de crédito'])

    await choose(wrapper, 'type', 'Receita')

    expect(wrapper.findAllComponents(SegmentedField).map((item) => item.props('name'))).toEqual([
      'type',
    ])
    expect(selects(wrapper)[3]!.props('modelValue')).toBe('w-1')
  })

  it('posts an expense paid on the card', async () => {
    vi.mocked(movementsApi.create).mockResolvedValue('m-9')
    const { wrapper } = await render()

    await turnOnPaid(wrapper)
    await choose(wrapper, 'via', 'Cartão de crédito')
    await fillBasics(wrapper)

    expect(wrapper.text()).toContain('Entra na fatura aberta do período.')
    expect(wrapper.text()).not.toContain('Poupança')
    expect(invoicesApi.findAll).toHaveBeenLastCalledWith({
      card: 'k-1',
      financialPeriod: 'p-11',
      statuses: ['OPEN'],
      size: 1,
    })
    expect(wrapper.find('[data-slot="no-open-invoice"]').exists()).toBe(false)

    await submit(wrapper)

    expect(movementsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payment: { card: 'k-1', paidOn: '2026-11-21', discount: null },
      }),
    )
  })

  it('warns when there is no open invoice of the card in the period', async () => {
    const { wrapper } = await render()
    vi.mocked(invoicesApi.findAll).mockResolvedValue(pageOf([]))

    await turnOnPaid(wrapper)
    await choose(wrapper, 'via', 'Cartão de crédito')

    expect(wrapper.find('[data-slot="no-open-invoice"]').text()).toContain(
      'Não há fatura aberta de Visa Platinum em Novembro',
    )
    expect(wrapper.find('[data-slot="no-open-invoice"]').text()).toContain('Nada é lançado.')

    await choose(wrapper, 'via', 'Carteira')

    expect(wrapper.find('[data-slot="no-open-invoice"]').exists()).toBe(false)
  })

  it('names no card or period in the warning while they are not chosen', async () => {
    const { wrapper } = await render(undefined, [periods[2]!])
    vi.mocked(invoicesApi.findAll).mockResolvedValue(pageOf([]))
    vi.mocked(cardsApi.findAll).mockResolvedValue(pageOf([]))

    await turnOnPaid(wrapper)
    await choose(wrapper, 'via', 'Cartão de crédito')

    expect(wrapper.find('[data-slot="no-open-invoice"]').exists()).toBe(false)
    expect(invoicesApi.findAll).not.toHaveBeenCalled()
  })

  it('shows the period of a closed status in the list when editing it', async () => {
    vi.mocked(movementsApi.findById).mockResolvedValue({
      ...existing,
      financialPeriod: { id: 'p-09', name: 'Setembro', status: 'CLOSED', expired: false },
    })

    const { wrapper } = await render('m-1')

    expect(optionsOf(wrapper, 0)).toEqual([
      { value: 'p-11', label: 'Novembro' },
      { value: 'p-10', label: 'Outubro · expirado' },
      { value: 'p-09', label: 'Setembro · encerrado' },
    ])
  })

  it('loads a movement for editing with the type and the period locked', async () => {
    vi.mocked(movementsApi.findById).mockResolvedValue(existing)

    const { wrapper } = await render('m-1')

    expect(wrapper.find('h1').text()).toBe('Editar movimento')
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('Conta de água')
    expect((field(wrapper, 'value').element as HTMLInputElement).value).toMatch(/96,12/)
    expect(wrapper.text()).toContain('Despesa')
    expect(wrapper.text()).toContain('O tipo não muda depois de lançado.')
    expect(wrapper.findAllComponents(SegmentedField)).toHaveLength(0)
    expect(wrapper.findAll('h2').map((title) => title.text())).not.toContain('Pagamento')
    expect(wrapper.find('button[type="submit"]').text()).toBe('Salvar')
    expect(wrapper.findAllComponents(SelectField)[0]!.props('disabled')).toBe(true)
    expect(wrapper.findAllComponents(SelectField)[1]!.props('disabled')).toBeFalsy()
  })

  it('shows an income being edited as income and one without cost center', async () => {
    vi.mocked(movementsApi.findById).mockResolvedValue({
      ...existing,
      type: 'INCOME',
      costCenter: null,
      classification: null,
    })

    const { wrapper } = await render('m-1')

    expect(wrapper.text()).toContain('Receita')
  })

  it('saves the changes and goes to the detail', async () => {
    vi.mocked(movementsApi.findById).mockResolvedValue(existing)
    vi.mocked(movementsApi.update).mockResolvedValue(existing)
    const { wrapper, router } = await render('m-1')

    await field(wrapper, 'name').setValue('Conta de luz')
    await submit(wrapper)

    expect(movementsApi.update).toHaveBeenCalledWith('m-1', {
      name: 'Conta de luz',
      value: 96.12,
      dueDate: '2026-11-20',
      costCenter: 'cc-1',
      classification: 'cl-1',
      description: 'Mensal',
    })
    expect(toast.success).toHaveBeenCalledWith('Alterações salvas', {
      description: undefined,
      duration: 4000,
    })
    expect(router.currentRoute.value.name).toBe('movements.detail')
  })

  it('shows the server error on top', async () => {
    vi.mocked(movementsApi.create).mockRejectedValue(
      problem(400, { error: 'financial-period-not-open' }),
    )
    const { wrapper } = await render()

    await fillBasics(wrapper)
    await submit(wrapper)

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain('não está aberto')
  })

  it('shows the server error when the options cannot be loaded', async () => {
    serve()
    vi.mocked(costCentersApi.findAll).mockRejectedValue(problem(500))

    const { wrapper } = await mountView(MovementFormView, 'movements')

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
  })
})
