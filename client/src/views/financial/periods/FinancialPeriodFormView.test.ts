import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { buttonWithText, mountView, problem, settle } from '@/test/crud'
import type { FinancialPeriodView } from '@/types'
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
  revenuesGoal: 5000,
  expensesGoal: null,
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
    vi.mocked(financialPeriodsApi.create).mockResolvedValue('p-9')
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
      description: undefined,
      duration: 4000,
    })
    expect(router.currentRoute.value.name).not.toBe('financial-periods.detail')
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('')
    expect(document.activeElement).toBe(field(wrapper, 'name').element)
  })

  it('accepts a one day period', async () => {
    vi.mocked(financialPeriodsApi.create).mockResolvedValue('p-9')
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
