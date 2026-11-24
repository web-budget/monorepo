import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { cardsApi } from '@/api/cards'
import { classificationsApi } from '@/api/classifications'
import { costCentersApi } from '@/api/costCenters'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { recurringMovementsApi } from '@/api/recurringMovements'
import { Select } from '@/components/ui/select'
import { mountView, pageOf, problem, settle } from '@/test/crud'
import type {
  CardListView,
  ClassificationListView,
  CostCenterListView,
  RecurringMovementView,
} from '@/types'
import RecurringMovementFormView from '@/views/financial/recurring/RecurringMovementFormView.vue'

vi.mock('@/api/recurringMovements')
vi.mock('@/api/financialPeriods')
vi.mock('@/api/costCenters')
vi.mock('@/api/classifications')
vi.mock('@/api/cards')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

type Wrapper = Awaited<ReturnType<typeof mountView>>['wrapper']

const existing = {
  id: 'r-1',
  name: 'Celular novo',
  type: 'EXPENSE',
  valueKind: 'FIXED',
  value: 250,
  suggestedValue: 250,
  installments: 12,
  firstInstallment: 1,
  launchedInstallments: 3,
  nextInstallment: 4,
  finished: false,
  autoLaunch: false,
  active: true,
  classification: { id: 'cl-1', name: 'Moradia', type: 'EXPENSE' },
  costCenter: { id: 'cc-1', name: 'Casa', fullName: 'Casa' },
  card: { id: 'k-1', name: 'Visa' },
} as RecurringMovementView

function field(wrapper: Wrapper, name: string) {
  return wrapper.find(`[name="${name}"]`)
}

function selects(wrapper: Wrapper) {
  return wrapper.findAllComponents(Select)
}

function switches(wrapper: Wrapper) {
  return wrapper.findAll('button[role="switch"]')
}

async function submit(wrapper: Wrapper) {
  await wrapper.find('form').trigger('submit')
  await settle()
}

function serve() {
  vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf([]))
  vi.mocked(costCentersApi.findAll).mockResolvedValue(
    pageOf([{ id: 'cc-1', name: 'Casa', fullName: 'Casa' }] as CostCenterListView[]),
  )
  vi.mocked(classificationsApi.findAll).mockResolvedValue(
    pageOf([
      { id: 'cl-1', name: 'Moradia', type: 'EXPENSE', active: true },
      { id: 'cl-2', name: 'Salário', type: 'INCOME', active: true },
    ] as ClassificationListView[]),
  )
  vi.mocked(cardsApi.findAll).mockResolvedValue(
    pageOf([{ id: 'k-1', name: 'Visa', active: true, flag: null }] as CardListView[]),
  )
  vi.mocked(recurringMovementsApi.findById).mockResolvedValue(existing)
}

async function render(id?: string) {
  serve()
  return mountView(RecurringMovementFormView, 'recurring-movements', id ? { id } : {})
}

async function fillBasics(wrapper: Wrapper) {
  await field(wrapper, 'name').setValue('Celular novo')
  await field(wrapper, 'value').setValue('25000')
  selects(wrapper)[1]!.vm.$emit('update:modelValue', 'cc-1')
  selects(wrapper)[2]!.vm.$emit('update:modelValue', 'cl-1')
}

describe('RecurringMovementFormView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the sections of a new recurring movement and asks for what is required', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Criando')
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual([
      'Tipo',
      'Identificação',
      'Modalidade',
      'Repetição',
      'Cartão sugerido',
      'Lançamento',
    ])
    expect(wrapper.text()).toContain('O recorrente termina sozinho depois da última parcela.')
    expect(wrapper.text()).toContain('Só sugere o cartão na hora de pagar.')
    expect(wrapper.text()).toContain('Vence no último dia do período.')
    expect(wrapper.find('button[type="submit"]').text()).toBe('Criar')

    await submit(wrapper)

    expect(recurringMovementsApi.create).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Campo obrigatório')
  })

  it('creates an installment expense with a suggested card and stays on the cleared form', async () => {
    const { wrapper, router } = await render()
    vi.mocked(recurringMovementsApi.create).mockResolvedValue('r-9')
    await fillBasics(wrapper)
    await switches(wrapper)[0]!.trigger('click')
    await field(wrapper, 'installments').setValue('12')
    await field(wrapper, 'firstInstallment').setValue('3')
    selects(wrapper)[4]!.vm.$emit('update:modelValue', 'k-1')
    await switches(wrapper)[1]!.trigger('click')

    await submit(wrapper)

    expect(recurringMovementsApi.create).toHaveBeenCalledWith({
      name: 'Celular novo',
      type: 'EXPENSE',
      valueKind: 'FIXED',
      value: 250,
      installments: 12,
      firstInstallment: 3,
      autoLaunch: true,
      classification: 'cl-1',
      costCenter: 'cc-1',
      card: 'k-1',
    })
    expect(toast.success).toHaveBeenCalledWith('Recorrente criado', {
      description: '“Celular novo” já pode ser lançado.',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).not.toBe('recurring-movements.detail')
    expect((wrapper.find('[name="name"]').element as HTMLInputElement).value).toBe('')
  })

  it('does not accept a current installment past the last one', async () => {
    const { wrapper } = await render()
    await fillBasics(wrapper)
    await switches(wrapper)[0]!.trigger('click')
    await field(wrapper, 'installments').setValue('3')
    await field(wrapper, 'firstInstallment').setValue('4')

    await submit(wrapper)

    expect(recurringMovementsApi.create).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('A parcela atual não pode passar do número de parcelas.')
  })

  it('names the value as a suggestion for the variable one', async () => {
    const { wrapper } = await render()
    expect(wrapper.text()).not.toContain('Valor sugerido')

    selects(wrapper)[3]!.vm.$emit('update:modelValue', 'VARIABLE')
    await settle()

    expect(wrapper.text()).toContain('Valor sugerido')
  })

  it('has no suggested card for an income and filters the classifications by type', async () => {
    const { wrapper } = await render()
    vi.mocked(recurringMovementsApi.create).mockResolvedValue('r-9')

    selects(wrapper)[0]!.vm.$emit('update:modelValue', 'INCOME')
    await settle()

    expect(wrapper.findAll('h2').map((title) => title.text())).not.toContain('Cartão sugerido')
    expect(wrapper.text()).toContain('Classificação de receita')

    await field(wrapper, 'name').setValue('Salário')
    await field(wrapper, 'value').setValue('500000')
    selects(wrapper)[1]!.vm.$emit('update:modelValue', 'cc-1')
    selects(wrapper)[2]!.vm.$emit('update:modelValue', 'cl-2')
    await submit(wrapper)

    expect(recurringMovementsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'INCOME', card: null, installments: null }),
    )
  })

  it('shows what the server refuses in the alert and keeps the form', async () => {
    const { wrapper, router } = await render()
    vi.mocked(recurringMovementsApi.create).mockRejectedValue(
      problem(400, { error: 'card-recurring-must-be-expense' }),
    )
    await fillBasics(wrapper)

    await submit(wrapper)

    expect(wrapper.find('[role="alert"]').text()).toContain('Só a despesa pode ter cartão sugerido')
    expect(router.currentRoute.value.name).toBeUndefined()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('edits without the value, the type and the modality, and saves the situation', async () => {
    const { wrapper, router } = await render('r-1')
    vi.mocked(recurringMovementsApi.update).mockResolvedValue(existing)

    expect(wrapper.find('h1').text()).toBe('Editando')
    expect(wrapper.text()).toContain('Celular novo')
    expect(field(wrapper, 'value').exists()).toBe(false)
    expect(field(wrapper, 'firstInstallment').exists()).toBe(false)
    expect(wrapper.text()).toContain('Para mudar o valor, use Reajustar valor no detalhe.')
    expect(wrapper.text()).toContain('Inativar para parar de lançar')
    expect(wrapper.find('button[type="submit"]').text()).toBe('Salvar')
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('Celular novo')
    expect((field(wrapper, 'installments').element as HTMLInputElement).value).toBe('12')

    await switches(wrapper)[0]!.trigger('click')
    await field(wrapper, 'installments').setValue('24')
    await submit(wrapper)

    expect(recurringMovementsApi.update).toHaveBeenCalledWith('r-1', {
      name: 'Celular novo',
      active: false,
      installments: 24,
      autoLaunch: false,
      classification: 'cl-1',
      costCenter: 'cc-1',
      card: 'k-1',
    })
    expect(toast.success).toHaveBeenCalledWith('Alterações salvas', {
      description: '“Celular novo” foi atualizado.',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).toBe('recurring-movements.detail')
  })

  it('edits an income that has no deadline', async () => {
    serve()
    vi.mocked(recurringMovementsApi.findById).mockResolvedValue({
      ...existing,
      type: 'INCOME',
      installments: null,
      card: null,
      classification: { id: 'cl-2', name: 'Salário', type: 'INCOME' },
    })
    const { wrapper } = await mountView(RecurringMovementFormView, 'recurring-movements', {
      id: 'r-1',
    })

    expect(wrapper.findAll('h2').map((title) => title.text())).not.toContain('Cartão sugerido')
    expect(field(wrapper, 'installments').exists()).toBe(false)
  })
})
