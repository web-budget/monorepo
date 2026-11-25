import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { buttonWithText, mountView, problem, settle } from '@/test/crud'
import type { FinancialPeriodCreationPreview, FinancialPeriodView } from '@/types'
import FinancialPeriodFormView from '@/views/financial/periods/FinancialPeriodFormView.vue'

vi.mock('@/api/financialPeriods')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

type Wrapper = Awaited<ReturnType<typeof mountView>>['wrapper']

const existing: FinancialPeriodView = {
  id: 'p-1',
  name: 'January',
  startingAt: '2026-01-01',
  endingAt: '2026-01-31',
  status: 'OPEN',
  expired: false,
  reopenable: false,
  revenuesGoal: 5000,
  expensesGoal: null,
}

const preview: FinancialPeriodCreationPreview = {
  recurringMovements: [
    { id: 'r-1', name: 'Salário', type: 'INCOME', value: 8400 },
    { id: 'r-2', name: 'Aluguel', type: 'EXPENSE', value: 1850 },
    {
      id: 'r-3',
      name: 'Celular novo',
      type: 'EXPENSE',
      value: 249.9,
      installment: 11,
      installments: 12,
    },
  ],
  invoices: [
    { id: 'k-1', name: 'Visa Platinum', lastFourDigits: '4821' },
    { id: 'k-2', name: 'Mastercard Gold', lastFourDigits: '1177' },
  ],
}

function field(wrapper: Wrapper, name: string) {
  return wrapper.find(`[name="${name}"]`)
}

async function submit(wrapper: Wrapper) {
  await wrapper.find('form').trigger('submit')
  await settle()
}

async function fillCreation(wrapper: Wrapper, name = 'January') {
  await field(wrapper, 'name').setValue(name)
  await field(wrapper, 'startingAt').setValue('2026-01-01')
  await field(wrapper, 'endingAt').setValue('2026-01-31')
}

describe('FinancialPeriodFormView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
    vi.mocked(financialPeriodsApi.findCreationPreview).mockResolvedValue(preview)
  })

  it('shows the title, the sections and no status toggle, and asks for the required fields', async () => {
    const { wrapper } = await mountView(FinancialPeriodFormView, 'financial-periods')

    expect(wrapper.find('h1').text()).toBe('Novo período')
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual([
      'Identificação',
      'Datas',
      'Metas',
    ])
    expect(wrapper.find('button[role="switch"]').exists()).toBe(false)
    expect(buttonWithText(wrapper, 'Criar')).toBeDefined()

    await submit(wrapper)

    expect(wrapper.text()).toContain('Campo obrigatório')
    expect(financialPeriodsApi.create).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(field(wrapper, 'name').element)
  })

  it('creates a period with its dates and goals and stays on the cleared form', async () => {
    vi.mocked(financialPeriodsApi.create).mockResolvedValue({
      id: 'p-9',
      recurringLaunch: { launched: [], skipped: [] },
    })
    const { wrapper, router } = await mountView(FinancialPeriodFormView, 'financial-periods')

    await fillCreation(wrapper)
    await field(wrapper, 'revenuesGoal').setValue('500000')
    await submit(wrapper)

    expect(financialPeriodsApi.create).toHaveBeenCalledWith({
      name: 'January',
      startingAt: '2026-01-01',
      endingAt: '2026-01-31',
      revenuesGoal: 5000,
      expensesGoal: null,
    })
    expect(toast.success).toHaveBeenCalledWith('Período criado', {
      description: '0 recorrentes lançados e 2 faturas abertas.',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).not.toBe('financial-periods.detail')
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('')
    expect(document.activeElement).toBe(field(wrapper, 'name').element)
  })

  it('opens with the dates of the month after the last period and refills them after creating', async () => {
    vi.mocked(financialPeriodsApi.findAll)
      .mockResolvedValueOnce({
        content: [{ ...existing, endingAt: '2026-12-31' }],
        page: { size: 1, number: 0, totalElements: 1, totalPages: 1 },
      })
      .mockResolvedValueOnce({
        content: [{ ...existing, endingAt: '2027-01-31' }],
        page: { size: 1, number: 0, totalElements: 1, totalPages: 1 },
      })
    vi.mocked(financialPeriodsApi.create).mockResolvedValue({
      id: 'p-9',
      recurringLaunch: { launched: [], skipped: [] },
    })
    const { wrapper } = await mountView(FinancialPeriodFormView, 'financial-periods')
    await settle()

    const value = (name: string) => (field(wrapper, name).element as HTMLInputElement).value
    expect(value('startingAt')).toBe('2027-01-01')
    expect(value('endingAt')).toBe('2027-01-31')
    expect(wrapper.text()).not.toContain('Alterações não salvas')

    await field(wrapper, 'name').setValue('Janeiro de 2027')
    await submit(wrapper)

    expect(financialPeriodsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ startingAt: '2027-01-01', endingAt: '2027-01-31' }),
    )
    expect(value('name')).toBe('')
    expect(value('startingAt')).toBe('2027-02-01')
    expect(value('endingAt')).toBe('2027-02-28')
  })

  it('says how many recurring movements entered with the period', async () => {
    const launched = [{ recurringMovement: 'r-1' }, { recurringMovement: 'r-2' }] as never
    vi.mocked(financialPeriodsApi.create).mockResolvedValue({
      id: 'p-9',
      recurringLaunch: { launched, skipped: [] },
    })
    const { wrapper } = await mountView(FinancialPeriodFormView, 'financial-periods')

    await fillCreation(wrapper)
    await submit(wrapper)

    expect(toast.success).toHaveBeenCalledWith('Período criado', {
      description: '2 recorrentes lançados e 2 faturas abertas.',
      duration: 4000,
    })
  })

  it('says one recurring movement entered in the singular', async () => {
    vi.mocked(financialPeriodsApi.create).mockResolvedValue({
      id: 'p-9',
      recurringLaunch: { launched: [{ recurringMovement: 'r-1' }] as never, skipped: [] },
    })
    const { wrapper } = await mountView(FinancialPeriodFormView, 'financial-periods')

    await fillCreation(wrapper)
    await submit(wrapper)

    expect(toast.success).toHaveBeenCalledWith('Período criado', {
      description: '1 recorrente lançado e 2 faturas abertas.',
      duration: 4000,
    })
  })

  it('says one invoice was opened in the singular', async () => {
    vi.mocked(financialPeriodsApi.findCreationPreview).mockResolvedValue({
      ...preview,
      invoices: preview.invoices.slice(0, 1),
    })
    vi.mocked(financialPeriodsApi.create).mockResolvedValue({
      id: 'p-9',
      recurringLaunch: { launched: [], skipped: [] },
    })
    const { wrapper } = await mountView(FinancialPeriodFormView, 'financial-periods')

    await fillCreation(wrapper)
    await submit(wrapper)

    expect(toast.success).toHaveBeenCalledWith('Período criado', {
      description: '0 recorrentes lançados e 1 fatura aberta.',
      duration: 4000,
    })
  })

  it('shows what entering the period will do, beside the form', async () => {
    const { wrapper } = await mountView(FinancialPeriodFormView, 'financial-periods')

    const aside = wrapper.find('[data-slot="creation-preview"]')
    expect(aside.text()).toContain('Ao criar este período')
    expect(aside.text()).toContain('Recorrentes automáticos lançados:')
    const recurring = aside.findAll('li').slice(0, 3)
    expect(recurring.map((item) => item.text())).toEqual([
      'Salário 8.400,00',
      'Aluguel 1.850,00',
      'Celular novo 11/12249,90',
    ])
    expect(
      aside
        .findAll('[data-slot="currency"]')
        .slice(0, 3)
        .map((value) => value.attributes('data-direction')),
    ).toEqual(['income', 'expense', 'expense'])
    expect(aside.text()).toContain('Faturas abertas criadas:')
    expect(
      aside
        .findAll('li')
        .slice(3)
        .map((item) => item.text()),
    ).toEqual(['Visa Platinum ••4821', 'Mastercard Gold ••1177'])
  })

  it('shows no aside when the server says nothing will be created', async () => {
    vi.mocked(financialPeriodsApi.findCreationPreview).mockResolvedValue({
      recurringMovements: [],
      invoices: [],
    })
    const { wrapper } = await mountView(FinancialPeriodFormView, 'financial-periods')

    expect(wrapper.find('[data-slot="creation-preview"]').exists()).toBe(false)
  })

  it('shows no aside when the preview cannot be loaded and still creates the period', async () => {
    vi.mocked(financialPeriodsApi.findCreationPreview).mockRejectedValue(problem(500))
    vi.mocked(financialPeriodsApi.create).mockResolvedValue({
      id: 'p-9',
      recurringLaunch: { launched: [], skipped: [] },
    })
    const { wrapper } = await mountView(FinancialPeriodFormView, 'financial-periods')
    expect(wrapper.find('[data-slot="creation-preview"]').exists()).toBe(false)

    await fillCreation(wrapper)
    await submit(wrapper)

    expect(toast.success).toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('loads the preview again after creating, because the installments moved', async () => {
    vi.mocked(financialPeriodsApi.create).mockResolvedValue({
      id: 'p-9',
      recurringLaunch: { launched: [], skipped: [] },
    })
    const { wrapper } = await mountView(FinancialPeriodFormView, 'financial-periods')
    expect(financialPeriodsApi.findCreationPreview).toHaveBeenCalledTimes(1)

    await fillCreation(wrapper)
    await submit(wrapper)

    expect(financialPeriodsApi.findCreationPreview).toHaveBeenCalledTimes(2)
  })

  it('shows the error that undoes the creation when a launch fails', async () => {
    vi.mocked(financialPeriodsApi.create).mockRejectedValue(
      problem(400, { error: 'inactive-classification' }),
    )
    const { wrapper } = await mountView(FinancialPeriodFormView, 'financial-periods')

    await fillCreation(wrapper)
    await submit(wrapper)

    expect(wrapper.find('[role="alert"]').text()).toContain('A classificação está inativa')
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('accepts a one day period', async () => {
    vi.mocked(financialPeriodsApi.create).mockResolvedValue({
      id: 'p-9',
      recurringLaunch: { launched: [], skipped: [] },
    })
    const { wrapper } = await mountView(FinancialPeriodFormView, 'financial-periods')

    await field(wrapper, 'name').setValue('Holiday')
    await field(wrapper, 'startingAt').setValue('2026-01-01')
    await field(wrapper, 'endingAt').setValue('2026-01-01')
    await submit(wrapper)

    expect(financialPeriodsApi.create).toHaveBeenCalled()
  })

  it('rejects an end date before the start date', async () => {
    const { wrapper } = await mountView(FinancialPeriodFormView, 'financial-periods')

    await field(wrapper, 'name').setValue('Backwards')
    await field(wrapper, 'startingAt').setValue('2026-02-01')
    await field(wrapper, 'endingAt').setValue('2026-01-01')
    await submit(wrapper)

    expect(wrapper.text()).toContain('A data de fim não pode ser anterior à data de início')
    expect(financialPeriodsApi.create).not.toHaveBeenCalled()
  })

  it('shows the server error inside the form', async () => {
    vi.mocked(financialPeriodsApi.create).mockRejectedValue(
      problem(400, { error: 'overlapping-start-end-dates' }),
    )
    const { wrapper } = await mountView(FinancialPeriodFormView, 'financial-periods')

    await fillCreation(wrapper)
    await submit(wrapper)

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'Já existe um período financeiro',
    )
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('loads a period for editing with the dates locked', async () => {
    vi.mocked(financialPeriodsApi.findById).mockResolvedValue(existing)

    const { wrapper } = await mountView(FinancialPeriodFormView, 'financial-periods', {
      id: 'p-1',
    })

    expect(wrapper.find('h1').text()).toBe('Editar nome e metas')
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('January')
    expect((field(wrapper, 'startingAt').element as HTMLInputElement).value).toBe('2026-01-01')
    expect(field(wrapper, 'startingAt').attributes('disabled')).toBeDefined()
    expect(field(wrapper, 'endingAt').attributes('disabled')).toBeDefined()
    expect((field(wrapper, 'revenuesGoal').element as HTMLInputElement).value).toBe('5.000,00')
    expect(wrapper.text()).toContain('Sem sobreposição com outro período.')
    expect(wrapper.find('[data-slot="creation-preview"]').exists()).toBe(false)
    expect(financialPeriodsApi.findCreationPreview).not.toHaveBeenCalled()
  })

  it('saves the new name and goals only, and goes to the detail', async () => {
    vi.mocked(financialPeriodsApi.findById).mockResolvedValue(existing)
    vi.mocked(financialPeriodsApi.update).mockResolvedValue(existing)
    const { wrapper, router } = await mountView(FinancialPeriodFormView, 'financial-periods', {
      id: 'p-1',
    })

    await field(wrapper, 'name').setValue('Jan 2026')
    await field(wrapper, 'expensesGoal').setValue('300000')
    await submit(wrapper)

    expect(financialPeriodsApi.update).toHaveBeenCalledWith('p-1', {
      name: 'Jan 2026',
      revenuesGoal: 5000,
      expensesGoal: 3000,
    })
    expect(toast.success).toHaveBeenCalledWith('Alterações salvas', {
      description: '“Jan 2026” foi atualizado.',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).toBe('financial-periods.detail')
  })

  it('shows the server error when the period is not open', async () => {
    vi.mocked(financialPeriodsApi.findById).mockResolvedValue(existing)
    vi.mocked(financialPeriodsApi.update).mockRejectedValue(
      problem(400, { error: 'financial-period-not-open' }),
    )
    const { wrapper } = await mountView(FinancialPeriodFormView, 'financial-periods', {
      id: 'p-1',
    })

    await submit(wrapper)

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'O período financeiro não esta aberto',
    )
  })

  it('goes back to the listing with Cancelar', async () => {
    const { wrapper, router } = await mountView(FinancialPeriodFormView, 'financial-periods')

    await buttonWithText(wrapper, 'Cancelar').trigger('click')
    await settle()

    expect(router.currentRoute.value.name).toBe('financial-periods')
  })
})
