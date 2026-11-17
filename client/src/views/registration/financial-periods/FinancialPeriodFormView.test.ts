import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { buttonWithText, mountView, problem, settle } from '@/test/crud'
import type { FinancialPeriodView } from '@/types'
import FinancialPeriodFormView from '@/views/registration/financial-periods/FinancialPeriodFormView.vue'

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
  status: 'ACTIVE',
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

describe('FinancialPeriodFormView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('asks for the required fields', async () => {
    const { wrapper } = await mountView(FinancialPeriodFormView, 'financial-periods')

    expect(wrapper.text()).toContain('Novo período financeiro')
    expect(wrapper.find('[aria-pressed]').exists()).toBe(false)
    await submit(wrapper)

    expect(wrapper.text()).toContain('Campo obrigatório')
    expect(financialPeriodsApi.create).not.toHaveBeenCalled()
  })

  it('creates a period with its dates and goals and clears the form', async () => {
    vi.mocked(financialPeriodsApi.create).mockResolvedValue(undefined)
    const { wrapper } = await mountView(FinancialPeriodFormView, 'financial-periods')

    await field(wrapper, 'name').setValue('January')
    await field(wrapper, 'startingAt').setValue('2026-01-01')
    await field(wrapper, 'endingAt').setValue('2026-01-31')
    await field(wrapper, 'revenuesGoal').setValue('5000')
    await submit(wrapper)

    expect(financialPeriodsApi.create).toHaveBeenCalledWith({
      name: 'January',
      startingAt: '2026-01-01',
      endingAt: '2026-01-31',
      revenuesGoal: 5000,
      expensesGoal: null,
    })
    expect(toast.success).toHaveBeenCalledWith('Registro criado', {
      description: 'Período financeiro criado com sucesso',
      duration: 4000,
    })
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('')
  })

  it('accepts a one day period', async () => {
    vi.mocked(financialPeriodsApi.create).mockResolvedValue(undefined)
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

    await field(wrapper, 'name').setValue('January')
    await field(wrapper, 'startingAt').setValue('2026-01-01')
    await field(wrapper, 'endingAt').setValue('2026-01-31')
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

    expect(wrapper.text()).toContain('Editando período financeiro')
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('January')
    expect((field(wrapper, 'startingAt').element as HTMLInputElement).value).toBe('2026-01-01')
    expect(field(wrapper, 'startingAt').attributes('disabled')).toBeDefined()
    expect(field(wrapper, 'endingAt').attributes('disabled')).toBeDefined()
    expect((field(wrapper, 'revenuesGoal').element as HTMLInputElement).value).toBe('5000')
  })

  it('saves the new name and goals only', async () => {
    vi.mocked(financialPeriodsApi.findById).mockResolvedValue(existing)
    vi.mocked(financialPeriodsApi.update).mockResolvedValue(existing)
    const { wrapper } = await mountView(FinancialPeriodFormView, 'financial-periods', {
      id: 'p-1',
    })

    await field(wrapper, 'name').setValue('Jan 2026')
    await field(wrapper, 'expensesGoal').setValue('3000')
    await submit(wrapper)

    expect(financialPeriodsApi.update).toHaveBeenCalledWith('p-1', {
      name: 'Jan 2026',
      revenuesGoal: 5000,
      expensesGoal: 3000,
    })
    expect(toast.success).toHaveBeenCalledWith('Registro atualizado', {
      description: 'Período financeiro atualizado com sucesso',
      duration: 4000,
    })
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

  it('goes back to the listing', async () => {
    const { wrapper, router } = await mountView(FinancialPeriodFormView, 'financial-periods')

    await buttonWithText(wrapper, 'Voltar').trigger('click')
    await settle()

    expect(router.currentRoute.value.name).toBe('financial-periods')
  })
})
