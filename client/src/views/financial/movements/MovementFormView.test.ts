import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { classificationsApi } from '@/api/classifications'
import { costCentersApi } from '@/api/costCenters'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { movementsApi } from '@/api/movements'
import { walletsApi } from '@/api/wallets'
import { Select } from '@/components/ui/select'
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
    pageOf([{ id: 'w-1', name: 'Conta corrente' }] as never[]),
  )
}

async function render(id?: string, content = periods) {
  serve(content)
  return mountView(MovementFormView, 'movements', id ? { id } : {})
}

async function fillBasics(wrapper: Wrapper) {
  await field(wrapper, 'name').setValue('Conta de água')
  await field(wrapper, 'value').setValue('9612')
  selects(wrapper)[2]!.vm.$emit('update:modelValue', 'cc-1')
  selects(wrapper)[3]!.vm.$emit('update:modelValue', 'cl-1')
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

    expect(wrapper.find('h1').text()).toBe('Lançando')
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

  it('posts a movement in the period that contains today and stays on the cleared form', async () => {
    vi.mocked(movementsApi.create).mockResolvedValue('m-9')
    const { wrapper, router } = await render()

    await fillBasics(wrapper)
    await field(wrapper, 'dueDate').setValue('2026-11-25')
    await field(wrapper, 'description').setValue('Mensal')
    await submit(wrapper)

    expect(movementsApi.create).toHaveBeenCalledWith({
      name: 'Conta de água',
      type: 'EXPENSE',
      value: 96.12,
      dueDate: '2026-11-25',
      financialPeriod: 'p-11',
      costCenter: 'cc-1',
      classification: 'cl-1',
      description: 'Mensal',
      payment: null,
    })
    expect(toast.success).toHaveBeenCalledWith('Movimento lançado', {
      description: '“Conta de água” já aparece no período.',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).not.toBe('movements.detail')
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('')
  })

  it('posts an income of the chosen period', async () => {
    vi.mocked(movementsApi.create).mockResolvedValue('m-9')
    const { wrapper } = await render()

    selects(wrapper)[0]!.vm.$emit('update:modelValue', 'INCOME')
    selects(wrapper)[1]!.vm.$emit('update:modelValue', 'p-10')
    await field(wrapper, 'name').setValue('Salário')
    await field(wrapper, 'value').setValue('840000')
    selects(wrapper)[2]!.vm.$emit('update:modelValue', 'cc-1')
    selects(wrapper)[3]!.vm.$emit('update:modelValue', 'cl-2')
    await submit(wrapper)

    expect(movementsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'INCOME',
        value: 8400,
        financialPeriod: 'p-10',
        classification: 'cl-2',
        dueDate: null,
        description: null,
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

  it('posts an already paid movement with the wallet and the discount', async () => {
    vi.mocked(movementsApi.create).mockResolvedValue('m-9')
    const { wrapper } = await render()

    expect(field(wrapper, 'wallet').exists()).toBe(false)
    await wrapper.find('button[role="switch"]').trigger('click')
    await settle()
    expect(wrapper.find('button[type="submit"]').text()).toBe('Lançar e pagar')

    await fillBasics(wrapper)
    selects(wrapper)[4]!.vm.$emit('update:modelValue', 'w-1')
    await field(wrapper, 'discount').setValue('1000')
    await submit(wrapper)

    expect(movementsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payment: { wallet: 'w-1', paidOn: '2026-11-21', discount: 10 },
      }),
    )
  })

  it('asks for the wallet of an already paid movement and refuses a discount as big as the value', async () => {
    const { wrapper } = await render()

    await wrapper.find('button[role="switch"]').trigger('click')
    await settle()
    await fillBasics(wrapper)
    await field(wrapper, 'discount').setValue('9612')
    await submit(wrapper)

    expect(movementsApi.create).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('O desconto precisa ser menor que o valor.')
    expect(wrapper.text()).toContain('Campo obrigatório')
  })

  it('asks for the date of an already paid movement', async () => {
    const { wrapper } = await render()

    await wrapper.find('button[role="switch"]').trigger('click')
    await settle()
    await fillBasics(wrapper)
    selects(wrapper)[4]!.vm.$emit('update:modelValue', 'w-1')
    await field(wrapper, 'paidOn').setValue('')
    await submit(wrapper)

    expect(movementsApi.create).not.toHaveBeenCalled()
  })

  it('loads a movement for editing with the type and the period locked', async () => {
    vi.mocked(movementsApi.findById).mockResolvedValue(existing)

    const { wrapper } = await render('m-1')

    expect(wrapper.find('h1').text()).toBe('Editando')
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('Conta de água')
    expect((field(wrapper, 'value').element as HTMLInputElement).value).toMatch(/96,12/)
    expect(wrapper.text()).toContain('Despesa')
    expect(wrapper.text()).toContain('O tipo não muda depois de lançado.')
    expect(wrapper.findAll('h2').map((title) => title.text())).not.toContain('Pagamento')
    expect(wrapper.find('button[type="submit"]').text()).toBe('Salvar')
    expect(selects(wrapper)[0]!.attributes('disabled')).toBeUndefined()
    expect(wrapper.find('button[role="combobox"][disabled]').exists()).toBe(true)
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
      description: '“Conta de luz” foi atualizado.',
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

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain('não esta aberto')
  })

  it('shows the server error when the options cannot be loaded', async () => {
    serve()
    vi.mocked(costCentersApi.findAll).mockRejectedValue(problem(500))

    const { wrapper } = await mountView(MovementFormView, 'movements')

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
  })
})
