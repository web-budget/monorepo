import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { movementsApi } from '@/api/movements'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, problem } from '@/test/crud'
import type { MovementView } from '@/types'
import MovementDetailView from '@/views/financial/movements/MovementDetailView.vue'

vi.mock('@/api/movements')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const open: MovementView = {
  id: 'm-1',
  name: 'Conta de água',
  type: 'EXPENSE',
  value: 96.12,
  dueDate: '2026-11-20',
  status: 'OPEN',
  overdue: true,
  classification: { id: 'cl-1', name: 'Moradia', type: 'EXPENSE' },
  costCenter: { id: 'cc-1', name: 'Casa', fullName: 'Casa' },
  financialPeriod: { id: 'p-1', name: 'Novembro', status: 'OPEN', expired: false },
  description: 'Mensal',
  payment: null,
}

const paid: MovementView = {
  ...open,
  id: 'm-2',
  name: 'Salário',
  type: 'INCOME',
  value: 8400,
  status: 'PAID',
  overdue: false,
  description: null,
  payment: {
    paidOn: '2026-11-05',
    value: 8400,
    discount: 100,
    valuePaid: 8300,
    wallet: { id: 'w-1', name: 'Conta corrente' },
    card: null,
  },
}

async function render(movement: MovementView) {
  vi.mocked(movementsApi.findById).mockResolvedValue(movement)
  return mountView(MovementDetailView, 'movements', { id: movement.id })
}

describe('MovementDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 21))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows an open overdue movement with its notice and no payment', async () => {
    const { wrapper } = await render(open)

    expect(movementsApi.findById).toHaveBeenCalledWith('m-1')
    expect(wrapper.find('h1').text()).toBe('Conta de água')
    expect(wrapper.find('[data-slot="page-title"]').element.parentElement!.textContent).toContain(
      'Vencido há 1 dia',
    )
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual([
      'Identificação',
      'Pagamento',
    ])
    expect(wrapper.text()).toContain('Despesa')
    expect(wrapper.text()).toMatch(/−\sR\$\s96,12/)
    expect(wrapper.text()).toContain('Moradia')
    expect(wrapper.text()).toContain('Mensal')
    expect(wrapper.text()).toContain('Sem pagamento.')
    expect(wrapper.find('[data-slot="overdue-notice"]').text()).toContain('Venceu em 20/11/2026')
    expect(wrapper.find('[data-slot="overdue-notice"]').text()).toContain('Em aberto há 1 dia.')
    expect(wrapper.find('[data-slot="paid-notice"]').exists()).toBe(false)
    expect(buttonWithText(wrapper, 'Remover')).toBeDefined()
    expect(wrapper.findAll('button').some((button) => button.text() === 'Editar')).toBe(false)
  })

  it('shows the payment of a paid movement and offers nothing to change', async () => {
    const { wrapper } = await render(paid)

    expect(wrapper.text()).toContain('Receita')
    expect(wrapper.text()).toMatch(/\+\sR\$\s8\.400,00/)
    expect(wrapper.text()).toContain('05/11/2026')
    expect(wrapper.text()).toContain('Conta corrente')
    expect(wrapper.text()).toContain('Carteira')
    expect(wrapper.text()).toMatch(/R\$\s8\.300,00/)
    expect(wrapper.find('[data-slot="paid-notice"]').text()).toContain('Pago: não se edita')
    expect(wrapper.find('[data-slot="overdue-notice"]').exists()).toBe(false)
    expect(wrapper.find('[data-slot="page-actions"]').exists()).toBe(false)
  })

  it('shows a card payment', async () => {
    const { wrapper } = await render({
      ...paid,
      payment: { ...paid.payment!, wallet: null, card: { id: 'c-1', name: 'Visa' } },
    })

    expect(wrapper.text()).toContain('Cartão de crédito')
    expect(wrapper.text()).toContain('Visa')
  })

  it('says the period is closed and offers nothing to change', async () => {
    const { wrapper } = await render({
      ...open,
      overdue: false,
      costCenter: null,
      classification: null,
      financialPeriod: { id: 'p-0', name: 'Setembro', status: 'CLOSED', expired: false },
    })

    expect(wrapper.find('[data-slot="closed-notice"]').text()).toContain(
      'Período encerrado: Setembro',
    )
    expect(wrapper.find('[data-slot="paid-notice"]').exists()).toBe(false)
    expect(wrapper.find('[data-slot="page-actions"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('---')
  })

  it('shows the title while the movement is loading', async () => {
    vi.mocked(movementsApi.findById).mockReturnValue(new Promise(() => undefined))

    const { wrapper } = await mountView(MovementDetailView, 'movements', { id: 'm-1' })

    expect(wrapper.find('h1').text()).toBe('Detalhando')
  })

  it('asks first, naming the movement, then deletes it and goes to the list', async () => {
    vi.mocked(movementsApi.remove).mockResolvedValue(undefined)
    const { wrapper, router } = await render(open)
    const dialog = useConfirmDialog()

    await buttonWithText(wrapper, 'Remover').trigger('click')
    expect(dialog.state.options.title).toBe('Excluir “Conta de água”?')
    dialog.accept()
    await flushPromises()

    expect(movementsApi.remove).toHaveBeenCalledWith('m-1')
    expect(toast.success).toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('movements')
  })

  it('shows the server error when the movement cannot be loaded', async () => {
    vi.mocked(movementsApi.findById).mockRejectedValue(
      problem(404, { error: 'resource-not-found' }),
    )

    const { wrapper } = await mountView(MovementDetailView, 'movements', { id: 'x' })

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
  })
})
