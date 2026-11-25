import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { recurringMovementsApi } from '@/api/recurringMovements'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, pageOf, problem, settle } from '@/test/crud'
import type {
  FinancialPeriodListView,
  RecurringLaunchEntryView,
  RecurringMovementView,
  RecurringValueView,
} from '@/types'
import RecurringMovementDetailView from '@/views/financial/recurring/RecurringMovementDetailView.vue'

vi.mock('@/api/recurringMovements')
vi.mock('@/api/financialPeriods')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const recurringMovement = {
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
  ended: false,
  autoLaunch: true,
  active: true,
  classification: { id: 'cl-1', name: 'Eletrônicos', type: 'EXPENSE' },
  costCenter: { id: 'cc-1', name: 'Pessoal', fullName: 'Casa > Pessoal' },
  card: { id: 'k-1', name: 'Visa', lastFourDigits: '4821' },
} as RecurringMovementView

const history: RecurringValueView[] = [
  {
    value: 250,
    reason: 'Reajuste anual',
    validFrom: '2026-11-24T10:00:00',
    validFromPeriod: { id: 'p-11', name: 'Novembro de 2026', startingAt: '2026-11-01' },
    current: true,
  },
  { value: 200, validFrom: '2026-01-24T10:00:00', current: false },
]

const launches: RecurringLaunchEntryView[] = [
  {
    financialPeriod: { id: 'p-11', name: 'Novembro de 2026', startingAt: '2026-11-01' },
    installment: 2,
    movement: 'm-2',
    value: 218.35,
    status: 'PAID',
    valuePaid: 210,
  },
  {
    financialPeriod: { id: 'p-10', name: 'Outubro de 2026', startingAt: '2026-10-01' },
    installment: 1,
    movement: 'm-1',
    value: 231.07,
    status: 'OPEN',
  },
]

function serve(content: Partial<RecurringMovementView> = {}) {
  vi.mocked(recurringMovementsApi.findById).mockResolvedValue({ ...recurringMovement, ...content })
  vi.mocked(recurringMovementsApi.findValues).mockResolvedValue(pageOf(history))
  vi.mocked(recurringMovementsApi.findLaunches).mockResolvedValue(pageOf(launches))
}

async function render(content: Partial<RecurringMovementView> = {}) {
  serve(content)
  return mountView(RecurringMovementDetailView, 'recurring-movements', { id: 'r-1' })
}

describe('RecurringMovementDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the name with the current installment and the situation', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Celular novo 3/12')
    expect(wrapper.find('[data-slot="badge"]').text()).toBe('Ativo')
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual([
      'Identificação',
      'Valor e repetição',
      'Histórico de valores',
    ])
  })

  it('puts Excluir, Reajustar valor, Lançar no período and Editar in that order, Editar being the primary one', async () => {
    const { wrapper } = await render()

    const actions = wrapper.findAll('[data-slot="page-actions"] button')
    expect(actions.map((button) => button.text())).toEqual([
      'Excluir',
      'Reajustar valor',
      'Lançar no período',
      'Editar',
    ])
    expect(actions[3]!.classes()).toContain('bg-primary')
  })

  it('shows the identification, the value and the repetition', async () => {
    const { wrapper } = await render()

    const text = wrapper.text()
    expect(text).toContain('Casa > Pessoal')
    expect(text).toContain('Eletrônicos')
    expect(text).not.toContain('Visa')
    expect(text).not.toContain('Cartão')
    expect(text).toMatch(/Valor atual\s*R\$\s*250,00/)
    expect(text).toContain('Fixo')
    expect(text).toContain('3/12')
    expect(text).toContain('Automático ao criar o período')
    expect(text).toContain('Último dia do período')
  })

  it('shows the ended badge and an indefinite term the server leaves out', async () => {
    const { wrapper } = await render({
      finished: true,
      ended: true,
      installments: undefined,
      launchedInstallments: undefined,
      card: undefined,
      autoLaunch: false,
      type: 'INCOME',
    })

    expect(wrapper.find('h1').text()).toBe('Celular novo')
    expect(wrapper.find('[data-slot="badge"]').text()).toBe('Encerrado')
    expect(wrapper.text()).toContain('Indeterminado')
    expect(wrapper.text()).not.toContain('undefined')
    expect(wrapper.text()).toContain('Manual, em lote')
  })

  it('lists the readjustments by month, flagging the current one', async () => {
    const { wrapper } = await render()

    expect(recurringMovementsApi.findValues).toHaveBeenCalledWith('r-1', { page: 0, size: 15 })
    expect(recurringMovementsApi.findLaunches).not.toHaveBeenCalled()
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('11/2026')
    expect(rows[0]!.text()).toContain('vigente')
    expect(rows[0]!.text()).toContain('Reajuste anual')
    expect(rows[0]!.text()).toContain('250,00')
    expect(rows[0]!.text()).not.toContain('R$')
    expect(rows[1]!.text()).toContain('01/2026')
    expect(rows[1]!.text()).not.toContain('vigente')
    expect(rows[1]!.text()).toContain('—')
    expect(wrapper.text()).toContain('1–2 de 2 reajustes')
  })

  it('says the value is fixed while there is only the initial one', async () => {
    serve()
    vi.mocked(recurringMovementsApi.findValues).mockResolvedValue(pageOf(history.slice(0, 1)))
    const { wrapper } = await mountView(RecurringMovementDetailView, 'recurring-movements', {
      id: 'r-1',
    })

    expect(wrapper.text()).toContain('Valor fixo.')
    expect(wrapper.find('tbody').exists()).toBe(false)
  })

  it('shows a skeleton, never the fixed note, while the history loads', async () => {
    serve()
    let finish: (value: ReturnType<typeof pageOf<RecurringValueView>>) => void = () => undefined
    vi.mocked(recurringMovementsApi.findValues).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const { wrapper } = await mountView(RecurringMovementDetailView, 'recurring-movements', {
      id: 'r-1',
    })

    expect(wrapper.text()).not.toContain('Valor fixo.')
    expect(wrapper.find('[aria-label="Carregando..."]').exists()).toBe(true)

    finish(pageOf(history.slice(0, 1)))
    await flushPromises()

    expect(wrapper.text()).toContain('Valor fixo.')
    expect(wrapper.find('[aria-label="Carregando..."]').exists()).toBe(false)
  })

  it('does not call the value fixed when the history cannot be loaded', async () => {
    serve()
    vi.mocked(recurringMovementsApi.findValues).mockRejectedValue(problem(500))
    const { wrapper } = await mountView(RecurringMovementDetailView, 'recurring-movements', {
      id: 'r-1',
    })

    expect(wrapper.text()).not.toContain('Valor fixo.')
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Carregando..."]').exists()).toBe(false)
  })

  it('goes to another page of the history', async () => {
    serve()
    vi.mocked(recurringMovementsApi.findValues).mockResolvedValue(pageOf(history, 40))
    const { wrapper } = await mountView(RecurringMovementDetailView, 'recurring-movements', {
      id: 'r-1',
    })

    await wrapper.find('button[aria-label="Próxima página"]').trigger('click')
    await settle()

    expect(recurringMovementsApi.findValues).toHaveBeenLastCalledWith('r-1', { page: 1, size: 15 })
  })

  it('shows the suggested value and what each period launched for a variable one', async () => {
    const { wrapper } = await render({ valueKind: 'VARIABLE', suggestedValue: 210 })

    expect(recurringMovementsApi.findLaunches).toHaveBeenCalledWith('r-1', { page: 0, size: 12 })
    expect(recurringMovementsApi.findValues).not.toHaveBeenCalled()
    const block = wrapper.find('[data-slot="suggested-value"]')
    expect(block.text()).toContain('Valor sugerido no próximo lançamento: 210,00.')
    const items = block.findAll('li')
    expect(items.map((item) => item.text())).toEqual([
      'Novembro de 2026210,00',
      'Outubro de 2026231,07',
    ])
    expect(wrapper.text()).not.toContain('Reajustar valor')
  })

  it('shows no list while the variable one was never launched', async () => {
    serve({ valueKind: 'VARIABLE' })
    vi.mocked(recurringMovementsApi.findLaunches).mockResolvedValue(pageOf([]))
    const { wrapper } = await mountView(RecurringMovementDetailView, 'recurring-movements', {
      id: 'r-1',
    })

    expect(wrapper.find('[data-slot="suggested-value"] li').exists()).toBe(false)
  })

  it('readjusts the value and reloads the history', async () => {
    const { wrapper } = await render()
    vi.mocked(recurringMovementsApi.readjust).mockResolvedValue({
      ...recurringMovement,
      value: 300,
    })

    await buttonWithText(wrapper, 'Reajustar valor').trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('Reajustar “Celular novo”')
    expect(document.body.textContent).toMatch(/Valor atual R\$\s*250,00\./)
    const value = document.body.querySelector<HTMLInputElement>('input[name="value"]')!
    expect(value.placeholder).toBe('250,00')
    value.value = '30000'
    value.dispatchEvent(new Event('input', { bubbles: true }))
    await flushPromises()
    document
      .querySelector('[role="dialog"] form')!
      .dispatchEvent(new Event('submit', { cancelable: true }))
    await settle()

    expect(recurringMovementsApi.readjust).toHaveBeenCalledWith('r-1', {
      value: 300,
      reason: null,
    })
    expect(toast.success).toHaveBeenCalledWith('Valor reajustado', expect.anything())
    expect(recurringMovementsApi.findValues).toHaveBeenCalledTimes(2)
  })

  it('closes the dialog without readjusting', async () => {
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Reajustar valor').trigger('click')
    await flushPromises()
    const cancel = [...document.body.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Cancelar',
    )!
    cancel.click()
    await flushPromises()

    expect(document.body.querySelector('[role="dialog"]')).toBeNull()

    await buttonWithText(wrapper, 'Reajustar valor').trigger('click')
    await flushPromises()
    document
      .querySelector('[role="dialog"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    expect(recurringMovementsApi.readjust).not.toHaveBeenCalled()
  })

  it('keeps the dialog open and shows what the server refuses', async () => {
    const { wrapper } = await render()
    vi.mocked(recurringMovementsApi.readjust).mockRejectedValue(problem(400))

    await buttonWithText(wrapper, 'Reajustar valor').trigger('click')
    await flushPromises()
    const value = document.body.querySelector<HTMLInputElement>('input[name="value"]')!
    value.value = '30000'
    value.dispatchEvent(new Event('input', { bubbles: true }))
    await flushPromises()
    document
      .querySelector('[role="dialog"] form')!
      .dispatchEvent(new Event('submit', { cancelable: true }))
    await settle()

    const dialog = document.body.querySelector('[role="dialog"]')!
    expect(dialog.querySelector('[data-slot="server-error"]')).not.toBeNull()
    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(false)
    expect(toast.success).not.toHaveBeenCalled()

    ;[...dialog.querySelectorAll('button')]
      .find((button) => button.textContent?.trim() === 'Cancelar')!
      .click()
    await flushPromises()
    await buttonWithText(wrapper, 'Reajustar valor').trigger('click')
    await flushPromises()
    expect(document.body.querySelector('[role="dialog"] [data-slot="server-error"]')).toBeNull()
  })

  it('edits and removes it', async () => {
    const { wrapper, router } = await render()
    vi.mocked(recurringMovementsApi.remove).mockResolvedValue(undefined)
    const dialog = useConfirmDialog()

    await buttonWithText(wrapper, 'Editar').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('recurring-movements.update')

    await buttonWithText(wrapper, 'Excluir').trigger('click')
    dialog.accept()
    await settle()

    expect(recurringMovementsApi.remove).toHaveBeenCalledWith('r-1')
    expect(router.currentRoute.value.name).toBe('recurring-movements')
  })

  it('shows the error when the load fails', async () => {
    vi.mocked(recurringMovementsApi.findById).mockRejectedValue(problem(404))
    const { wrapper } = await mountView(RecurringMovementDetailView, 'recurring-movements', {
      id: 'r-1',
    })

    expect(wrapper.find('h1').text()).toBe('Detalhando')
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(recurringMovementsApi.findValues).not.toHaveBeenCalled()
    expect(recurringMovementsApi.findLaunches).not.toHaveBeenCalled()
  })

  describe('launching in the period', () => {
    const december = {
      id: 'p-12',
      name: 'Dezembro de 2026',
      startingAt: '2026-12-01',
      endingAt: '2026-12-31',
      status: 'OPEN',
      expired: false,
    } as FinancialPeriodListView

    const installmentBased = { installments: 4, launchedInstallments: 2, nextInstallment: 3 }
    const endless = {
      installments: undefined,
      launchedInstallments: undefined,
      nextInstallment: undefined,
    }

    async function openDialog(
      content: Partial<RecurringMovementView> = installmentBased,
      periods: FinancialPeriodListView[] = [december],
    ) {
      vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf(periods))
      const { wrapper } = await render(content)
      await buttonWithText(wrapper, 'Lançar no período').trigger('click')
      await flushPromises()
      return wrapper
    }

    function type(name: string, value: string) {
      const input = document.body.querySelector<HTMLInputElement>(`input[name="${name}"]`)!
      input.value = value
      input.dispatchEvent(new Event('input', { bubbles: true }))
      return flushPromises()
    }

    function preview() {
      return document.body.querySelector('[data-slot="launch-preview"]')?.textContent
    }

    async function submit() {
      document
        .querySelector('[role="dialog"] form')!
        .dispatchEvent(new Event('submit', { cancelable: true }))
      await settle()
    }

    function dialog() {
      return document.body.querySelector('[role="dialog"]')
    }

    function dialogButton(text: string) {
      return [...dialog()!.querySelectorAll('button')].find(
        (button) => button.textContent?.trim() === text,
      )!
    }

    it('offers the action only on an active recurring movement that is not finished', async () => {
      const variable = await render({ valueKind: 'VARIABLE' })
      expect(variable.wrapper.text()).toContain('Lançar no período')
      expect(variable.wrapper.text()).not.toContain('Reajustar valor')

      const inactive = await render({ active: false, ended: true })
      expect(inactive.wrapper.text()).not.toContain('Lançar no período')

      const finished = await render({ finished: true, ended: true })
      expect(finished.wrapper.text()).not.toContain('Lançar no período')
    })

    it('previews the installments that will be created and the due date', async () => {
      await openDialog(installmentBased)

      expect(dialog()!.textContent).toContain('Lançar “Celular novo” no período')
      expect(dialog()!.textContent).toContain('De 1 a 2, as parcelas que faltam.')
      expect(preview()).toContain('Celular novo 3/4, vencendo em 31/12/2026.')

      await type('quantity', '2')
      expect(preview()).toContain('Celular novo 3/4 e 4/4, vencendo em 31/12/2026.')

      await type('quantity', '3')
      expect(preview()).toBeUndefined()
    })

    it('lists three or more installments', async () => {
      await openDialog({ installments: 12, launchedInstallments: 2, nextInstallment: 3 })

      await type('quantity', '3')

      expect(preview()).toContain('Celular novo 3/12, 4/12 e 5/12, vencendo em 31/12/2026.')
    })

    it('previews an endless recurring movement without installments', async () => {
      await openDialog(endless)

      expect(dialog()!.textContent).toContain('De 1 a 12.')
      expect(preview()).toContain('Celular novo, vencendo em 31/12/2026.')

      await type('quantity', '2')
      expect(preview()).toContain('2 lançamentos de Celular novo, vencendo em 31/12/2026.')
    })

    it('launches the quantity, shows the toast and reloads the recurring movement', async () => {
      vi.mocked(recurringMovementsApi.launchExtra).mockResolvedValue({
        launched: [
          { recurringMovement: 'r-1', installment: 3, movement: {} as never },
          { recurringMovement: 'r-1', installment: 4, movement: {} as never },
        ],
        skipped: [],
      })
      await openDialog(installmentBased)

      await type('quantity', '2')
      await submit()

      expect(recurringMovementsApi.launchExtra).toHaveBeenCalledWith('r-1', {
        financialPeriod: 'p-12',
        quantity: 2,
      })
      expect(toast.success).toHaveBeenCalledWith('2 lançamentos criados', expect.anything())
      expect(dialog()).toBeNull()
      expect(recurringMovementsApi.findById).toHaveBeenCalledTimes(2)
    })

    it('refuses a quantity above what is left without calling the server', async () => {
      await openDialog(installmentBased)

      await type('quantity', '3')
      await submit()

      expect(recurringMovementsApi.launchExtra).not.toHaveBeenCalled()
      expect(dialog()).not.toBeNull()
    })

    it('takes a value only for a variable recurring movement', async () => {
      vi.mocked(recurringMovementsApi.launchExtra).mockResolvedValue({ launched: [], skipped: [] })
      await openDialog({ ...endless, valueKind: 'VARIABLE', suggestedValue: 218.35 })

      const value = document.body.querySelector<HTMLInputElement>('input[name="value"]')!
      expect(value.placeholder).toBe('218,35')
      expect(dialog()!.textContent).toMatch(
        /Opcional\. Em branco usa o valor sugerido, R\$\s*218,35\./,
      )

      await type('value', '9840')
      await submit()

      expect(recurringMovementsApi.launchExtra).toHaveBeenCalledWith('r-1', {
        financialPeriod: 'p-12',
        quantity: 1,
        value: 98.4,
      })
    })

    it('does not take the focus from the field when the cancel button is pressed', async () => {
      await openDialog(installmentBased)
      const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true })

      dialogButton('Cancelar').dispatchEvent(press)

      expect(press.defaultPrevented).toBe(true)
    })

    it('closes without launching on Escape', async () => {
      await openDialog(installmentBased)

      dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await flushPromises()

      expect(dialog()).toBeNull()
      expect(recurringMovementsApi.launchExtra).not.toHaveBeenCalled()
    })

    it('has no value field on a fixed recurring movement', async () => {
      await openDialog(installmentBased)

      expect(document.body.querySelector('input[name="value"]')).toBeNull()
    })

    it('keeps the dialog open and shows what the server refuses inside it', async () => {
      vi.mocked(recurringMovementsApi.launchExtra).mockRejectedValue(problem(400))
      const wrapper = await openDialog(installmentBased)

      await submit()

      expect(dialog()!.querySelector('[data-slot="server-error"]')).not.toBeNull()
      expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(false)
      expect(toast.success).not.toHaveBeenCalled()

      dialogButton('Cancelar').click()
      await flushPromises()
      expect(dialog()).toBeNull()

      await buttonWithText(wrapper, 'Lançar no período').trigger('click')
      await flushPromises()
      expect(dialog()!.querySelector('[data-slot="server-error"]')).toBeNull()
    })

    it('warns when there is no open period and does not let it launch', async () => {
      await openDialog(installmentBased, [])

      expect(dialog()!.textContent).toContain('Não há período aberto')
      expect(preview()).toBeUndefined()
      expect(dialogButton('Lançar').disabled).toBe(true)
    })

    it('marks an expired period', async () => {
      await openDialog(installmentBased, [{ ...december, expired: true }])

      expect(dialog()!.textContent).toContain('Dezembro de 2026 · expirado')
    })

    it('shows the error inside the dialog when the periods fail to load', async () => {
      vi.mocked(financialPeriodsApi.findAll).mockRejectedValue(problem(500))
      const { wrapper } = await render(installmentBased)

      await buttonWithText(wrapper, 'Lançar no período').trigger('click')
      await flushPromises()

      expect(dialog()!.querySelector('[data-slot="server-error"]')).not.toBeNull()
    })
  })
})
