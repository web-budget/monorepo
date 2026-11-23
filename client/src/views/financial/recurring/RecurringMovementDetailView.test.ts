import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { recurringMovementsApi } from '@/api/recurringMovements'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, pageOf, problem, settle } from '@/test/crud'
import type { RecurringMovementView, RecurringValueView } from '@/types'
import RecurringMovementDetailView from '@/views/financial/recurring/RecurringMovementDetailView.vue'

vi.mock('@/api/recurringMovements')
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
  autoLaunch: true,
  active: true,
  classification: { id: 'cl-1', name: 'Eletrônicos', type: 'EXPENSE' },
  costCenter: { id: 'cc-1', name: 'Pessoal', fullName: 'Casa > Pessoal' },
  card: { id: 'k-1', name: 'Visa' },
} as RecurringMovementView

const history: RecurringValueView[] = [
  { value: 250, reason: 'Reajuste anual', validFrom: '2026-11-01T10:00:00' },
  { value: 200, reason: null, validFrom: '2026-01-01T10:00:00' },
]

function serve(content: Partial<RecurringMovementView> = {}) {
  vi.mocked(recurringMovementsApi.findById).mockResolvedValue({ ...recurringMovement, ...content })
  vi.mocked(recurringMovementsApi.findValues).mockResolvedValue(pageOf(history))
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

  it('shows the identification, the value and the repetition', async () => {
    const { wrapper } = await render()

    const text = wrapper.text()
    expect(text).toContain('Casa > Pessoal')
    expect(text).toContain('Eletrônicos')
    expect(text).toContain('Visa')
    expect(text).toMatch(/Valor atual\s*R\$\s*250,00/)
    expect(text).toContain('Fixo')
    expect(text).toContain('3/12')
    expect(text).toContain('Automático')
    expect(text).toContain('Último dia do período')
  })

  it('shows the finished badge, no card and an indefinite term', async () => {
    const { wrapper } = await render({
      finished: true,
      card: null,
      installments: null,
      autoLaunch: false,
      type: 'INCOME',
    })

    expect(wrapper.find('h1').text()).toBe('Celular novo')
    expect(wrapper.find('[data-slot="badge"]').text()).toBe('Encerrado')
    expect(wrapper.text()).not.toContain('Cartão sugerido')
    expect(wrapper.text()).toContain('Indeterminado')
    expect(wrapper.text()).toContain('Manual')
  })

  it('lists the history of values, flagging the current one', async () => {
    const { wrapper } = await render()

    expect(recurringMovementsApi.findValues).toHaveBeenCalledWith('r-1', { page: 0, size: 15 })
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('vigente')
    expect(rows[0]!.text()).toContain('Reajuste anual')
    expect(rows[0]!.text()).toMatch(/R\$\s*250,00/)
    expect(rows[1]!.text()).not.toContain('vigente')
    expect(rows[1]!.text()).toContain('—')
  })

  it('goes to another page of the history without a current flag', async () => {
    vi.mocked(recurringMovementsApi.findValues).mockResolvedValue(pageOf(history, 40))
    serve()
    vi.mocked(recurringMovementsApi.findValues).mockResolvedValue(pageOf(history, 40))
    const { wrapper } = await mountView(RecurringMovementDetailView, 'recurring-movements', {
      id: 'r-1',
    })

    await wrapper.find('button[aria-label="Próxima página"]').trigger('click')
    await settle()

    expect(recurringMovementsApi.findValues).toHaveBeenLastCalledWith('r-1', { page: 1, size: 15 })
    expect(wrapper.text()).not.toContain('vigente')
  })

  it('shows the suggested value of the next launch for a variable one, with no readjustment', async () => {
    const { wrapper } = await render({ valueKind: 'VARIABLE', suggestedValue: 210 })

    expect(wrapper.find('[data-slot="suggested-value"]').text()).toMatch(
      /Valor sugerido no próximo lançamento:\s*R\$\s*210,00\./,
    )
    expect(wrapper.text()).not.toContain('Reajustar valor')
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
    expect(document.body.textContent).toMatch(/Valor atual\s*R\$\s*250,00/)
    const value = document.body.querySelector<HTMLInputElement>('input[name="value"]')!
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

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('edits and removes it', async () => {
    const { wrapper, router } = await render()
    vi.mocked(recurringMovementsApi.remove).mockResolvedValue(undefined)
    const dialog = useConfirmDialog()

    await buttonWithText(wrapper, 'Editar').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('recurring-movements.update')

    await buttonWithText(wrapper, 'Remover').trigger('click')
    dialog.accept()
    await settle()

    expect(recurringMovementsApi.remove).toHaveBeenCalledWith('r-1')
    expect(router.currentRoute.value.name).toBe('recurring-movements')
  })

  it('shows the error when the load fails', async () => {
    vi.mocked(recurringMovementsApi.findById).mockRejectedValue(problem(404))
    vi.mocked(recurringMovementsApi.findValues).mockResolvedValue(pageOf([]))
    const { wrapper } = await mountView(RecurringMovementDetailView, 'recurring-movements', {
      id: 'r-1',
    })

    expect(wrapper.find('h1').text()).toBe('Detalhando')
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  })
})
