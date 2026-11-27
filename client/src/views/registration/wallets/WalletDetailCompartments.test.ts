import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { compartmentsApi } from '@/api/compartments'
import { walletsApi } from '@/api/wallets'
import CompartmentFormDialog from '@/components/compartments/CompartmentFormDialog.vue'
import CompartmentMovementDialog from '@/components/compartments/CompartmentMovementDialog.vue'
import CompartmentsCard from '@/components/compartments/CompartmentsCard.vue'
import DeleteCompartmentDialog from '@/components/compartments/DeleteCompartmentDialog.vue'
import { buttonWithText, mountView, problem } from '@/test/crud'
import type { CompartmentView, WalletView } from '@/types'
import WalletDetailView from '@/views/registration/wallets/WalletDetailView.vue'

vi.mock('@/api/wallets')
vi.mock('@/api/compartments')
vi.mock('@/api/walletEntries')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const wallet: WalletView = {
  id: 'w-1',
  name: 'Main',
  type: 'BANK_ACCOUNT',
  currentBalance: -5,
  totalBalance: 1045,
  compartmentCount: 2,
  active: true,
  description: null,
  bank: 'ACME',
  agency: '123',
  number: '456',
  lastEntryOn: '2026-11-20T10:05:00',
}

const reserve: CompartmentView = {
  id: 'k-1',
  name: 'Emergency',
  type: 'RESERVE',
  balance: 1000,
  statementEntryCount: 3,
  achieved: false,
  overdue: false,
}

const trip: CompartmentView = {
  id: 'k-2',
  name: 'Trip',
  type: 'GOAL',
  balance: 1050,
  statementEntryCount: 0,
  achieved: false,
  overdue: false,
  description: 'Beach',
  targetValue: 1800,
  targetDate: '2027-02-10',
  progress: 0.5833,
  monthlyAmount: 187.5,
}

async function render(compartments: CompartmentView[] = [reserve, trip], view = wallet) {
  vi.mocked(walletsApi.findById).mockResolvedValue(view)
  vi.mocked(compartmentsApi.findAll).mockResolvedValue(compartments)
  return mountView(WalletDetailView, 'wallets', { id: 'w-1' }, {}, undefined, [
    { path: '/c/:id/:compartmentId', name: 'wallets.compartments.detail', component: { render: () => null } },
  ])
}

describe('WalletDetailView piggy banks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the total and the free balance when the wallet has piggy banks', async () => {
    const { wrapper } = await render()

    expect(wrapper.text()).toContain('Total')
    expect(wrapper.text()).toContain('Saldo livre')
    expect(wrapper.text()).not.toContain('Saldo atual')
    expect(wrapper.text()).toMatch(/−R\$\s?5,00/)
    expect(wrapper.text()).toMatch(/R\$\s?1\.045,00/)
  })

  it('lists the piggy banks with the progress and the way to the goal', async () => {
    const { wrapper } = await render()

    const rows = wrapper.findAll('[data-slot="compartment-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('Emergency')
    expect(rows[0]!.text()).toContain('Reserva')
    expect(rows[0]!.text()).toContain('1.000,00')
    expect(rows[1]!.text()).toContain('58% de 1.800,00')
    expect(rows[1]!.text()).toContain('187,50 por mês até 10/02/2027')
    expect(rows[1]!.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('58')
  })

  it('tells when the goal was achieved, is overdue or has only a date', async () => {
    const { wrapper } = await render([
      { ...trip, id: 'a', name: 'Done', progress: 1.5, achieved: true, monthlyAmount: null },
      { ...trip, id: 'b', name: 'Late', overdue: true, targetDate: '2026-10-31', monthlyAmount: null },
      { ...trip, id: 'c', name: 'Dated', targetValue: null, progress: null, monthlyAmount: null },
      { ...trip, id: 'd', name: 'Open', monthlyAmount: null, targetDate: null },
    ])

    const rows = wrapper.findAll('[data-slot="compartment-row"]')
    expect(rows[0]!.text()).toContain('150% de 1.800,00')
    expect(rows[0]!.text()).toContain('Alcançado')
    expect(rows[0]!.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('100')
    expect(rows[1]!.text()).toContain('Prazo vencido em 31/10/2026')
    expect(rows[2]!.text()).toContain('Até 10/02/2027')
    expect(rows[2]!.find('[role="progressbar"]').exists()).toBe(false)
    expect(rows[3]!.text()).toContain('58% de 1.800,00')
    expect(rows[3]!.text()).not.toContain('por mês')
  })

  it('counts a goal without progress as zero', async () => {
    const { wrapper } = await render([{ ...trip, progress: null, monthlyAmount: null }])

    expect(wrapper.find('[data-slot="compartment-row"]').text()).toContain('0% de 1.800,00')
  })

  it('shows the empty state and the current balance of a wallet without piggy banks', async () => {
    const { wrapper } = await render([], { ...wallet, compartmentCount: 0, currentBalance: 10 })

    expect(wrapper.find('[data-slot="compartments-empty"]').text()).toContain(
      'Nenhum cofrinho nesta carteira',
    )
    expect(wrapper.text()).toContain('Saldo atual')
    expect(buttonWithText(wrapper, 'Guardar').attributes('disabled')).toBeDefined()
    expect(buttonWithText(wrapper, 'Resgatar').attributes('disabled')).toBeDefined()
  })

  it('freezes the piggy banks of an inactive wallet', async () => {
    const { wrapper } = await render([], { ...wallet, active: false })

    expect(buttonWithText(wrapper, 'Criar').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-slot="compartments-empty"] button').exists()).toBe(false)
  })

  it('opens the history of a piggy bank from the row', async () => {
    const { wrapper, router } = await render()

    await wrapper.findAll('[data-slot="compartment-row"]')[0]!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('wallets.compartments.detail')
    expect(router.currentRoute.value.params).toEqual({ id: 'w-1', compartmentId: 'k-1' })
  })

  it('creates a piggy bank, closes the dialog and reloads', async () => {
    vi.mocked(compartmentsApi.create).mockResolvedValue('k-9')
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Criar').trigger('click')
    const dialog = wrapper.getComponent(CompartmentFormDialog)
    expect(dialog.props('open')).toBe(true)
    expect(dialog.props('compartment')).toBeNull()

    dialog.vm.$emit('submit', { name: ' Car ', type: 'RESERVE' })
    await flushPromises()

    expect(compartmentsApi.create).toHaveBeenCalledWith('w-1', {
      name: 'Car',
      type: 'RESERVE',
      description: null,
      targetValue: null,
      targetDate: null,
    })
    expect(toast.success).toHaveBeenCalledWith('Cofrinho criado', {
      description: 'Car, em Main.',
      duration: 4000,
    })
    expect(dialog.props('open')).toBe(false)
    expect(compartmentsApi.findAll).toHaveBeenCalledTimes(2)
  })

  it('shows what the server refuses in the dialog and keeps it open', async () => {
    vi.mocked(compartmentsApi.create).mockRejectedValue(
      problem(409, { error: 'conflicting-properties', parameters: { 'compartment.name': 'Car' } }),
    )
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Criar').trigger('click')
    const dialog = wrapper.getComponent(CompartmentFormDialog)
    dialog.vm.$emit('submit', { name: 'Car', type: 'RESERVE' })
    await flushPromises()

    expect(dialog.props('fieldErrors')).toEqual({
      name: 'Já existe um cofrinho com o nome "Car" nesta carteira',
    })
    expect(dialog.props('messages')).toEqual([])
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('edits a piggy bank and closes the dialog', async () => {
    vi.mocked(compartmentsApi.update).mockResolvedValue(reserve)
    const { wrapper } = await render()

    wrapper.getComponent(CompartmentsCard).vm.$emit('edit', 'k-1')
    await flushPromises()
    const dialog = wrapper.getComponent(CompartmentFormDialog)
    expect(dialog.props('compartment')).toEqual(reserve)

    dialog.vm.$emit('submit', { name: 'Emergency 2', type: 'RESERVE' })
    await flushPromises()

    expect(compartmentsApi.update).toHaveBeenCalledWith('w-1', 'k-1', {
      name: 'Emergency 2',
      description: null,
      targetValue: null,
      targetDate: null,
    })
    expect(toast.success).toHaveBeenCalledWith('Cofrinho salvo', {
      description: 'Emergency 2, em Main.',
      duration: 4000,
    })
    expect(dialog.props('open')).toBe(false)
  })

  it('closes the form without saving', async () => {
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Criar').trigger('click')
    wrapper.getComponent(CompartmentFormDialog).vm.$emit('close')
    await flushPromises()

    expect(wrapper.getComponent(CompartmentFormDialog).props('open')).toBe(false)
    expect(compartmentsApi.create).not.toHaveBeenCalled()
  })

  it('deletes an empty piggy bank from the confirmation dialog', async () => {
    vi.mocked(compartmentsApi.remove).mockResolvedValue(undefined)
    const { wrapper } = await render([{ ...reserve, balance: 0 }])

    wrapper.getComponent(CompartmentsCard).vm.$emit('remove', 'k-1')
    await flushPromises()
    const dialog = wrapper.getComponent(DeleteCompartmentDialog)
    expect(dialog.props('compartment')?.id).toBe('k-1')

    dialog.vm.$emit('confirm')
    await flushPromises()

    expect(compartmentsApi.remove).toHaveBeenCalledWith('w-1', 'k-1')
    expect(toast.success).toHaveBeenCalledWith('Cofrinho excluído', {
      description: 'Emergency saiu de Main.',
      duration: 4000,
    })
    expect(dialog.props('compartment')).toBeNull()
  })

  it('keeps the delete dialog open with the refusal of the server', async () => {
    vi.mocked(compartmentsApi.remove).mockRejectedValue(
      problem(400, { error: 'compartment-with-balance' }),
    )
    const { wrapper } = await render([{ ...reserve, balance: 0 }])

    wrapper.getComponent(CompartmentsCard).vm.$emit('remove', 'k-1')
    await flushPromises()
    const dialog = wrapper.getComponent(DeleteCompartmentDialog)
    dialog.vm.$emit('confirm')
    await flushPromises()

    expect(dialog.props('messages')).toEqual(['O cofrinho ainda tem saldo e não pode ser excluído'])
    expect(dialog.props('compartment')).not.toBeNull()
  })

  it('confirms nothing when there is no piggy bank to delete', async () => {
    const { wrapper } = await render()

    wrapper.getComponent(DeleteCompartmentDialog).vm.$emit('confirm')
    await flushPromises()

    expect(compartmentsApi.remove).not.toHaveBeenCalled()
  })

  it('offers to withdraw everything before deleting a piggy bank with balance', async () => {
    const { wrapper } = await render()

    wrapper.getComponent(CompartmentsCard).vm.$emit('remove', 'k-1')
    await flushPromises()
    wrapper.getComponent(DeleteCompartmentDialog).vm.$emit('withdrawAll')
    await flushPromises()

    expect(wrapper.getComponent(DeleteCompartmentDialog).props('compartment')).toBeNull()
    expect(wrapper.getComponent(CompartmentMovementDialog).props('request')).toEqual({
      direction: 'WITHDRAWAL',
      compartmentId: 'k-1',
      value: 1000,
    })
  })

  it('does nothing when asked to withdraw everything without a piggy bank', async () => {
    const { wrapper } = await render()

    wrapper.getComponent(DeleteCompartmentDialog).vm.$emit('withdrawAll')
    await flushPromises()

    expect(wrapper.getComponent(CompartmentMovementDialog).props('request')).toBeNull()
  })

  it('closes the delete dialog without deleting', async () => {
    const { wrapper } = await render()

    wrapper.getComponent(CompartmentsCard).vm.$emit('remove', 'k-1')
    await flushPromises()
    wrapper.getComponent(DeleteCompartmentDialog).vm.$emit('close')
    await flushPromises()

    expect(wrapper.getComponent(DeleteCompartmentDialog).props('compartment')).toBeNull()
    expect(compartmentsApi.remove).not.toHaveBeenCalled()
  })

  it('saves money into a piggy bank with the toast of the free balance', async () => {
    vi.mocked(compartmentsApi.move).mockResolvedValue({} as never)
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Guardar').trigger('click')
    const dialog = wrapper.getComponent(CompartmentMovementDialog)
    expect(dialog.props('request')).toEqual({ direction: 'DEPOSIT', compartmentId: undefined })

    dialog.vm.$emit('move', 'k-1', { direction: 'DEPOSIT', value: 350, note: null })
    await flushPromises()

    expect(compartmentsApi.move).toHaveBeenCalledWith('w-1', 'k-1', {
      direction: 'DEPOSIT',
      value: 350,
      note: null,
    })
    expect(toast.success).toHaveBeenCalledWith('Guardado em Emergency', {
      description: '350,00 saíram do saldo livre de Main.',
      duration: 4000,
    })
    expect(dialog.props('request')).toBeNull()
  })

  it('withdraws from a piggy bank chosen on its menu', async () => {
    vi.mocked(compartmentsApi.move).mockResolvedValue({} as never)
    const { wrapper } = await render()

    wrapper.getComponent(CompartmentsCard).vm.$emit('withdraw', 'k-2')
    await flushPromises()
    const dialog = wrapper.getComponent(CompartmentMovementDialog)
    expect(dialog.props('request')?.compartmentId).toBe('k-2')

    dialog.vm.$emit('move', 'k-2', { direction: 'WITHDRAWAL', value: 50, note: 'Back' })
    await flushPromises()

    expect(toast.success).toHaveBeenCalledWith('Resgatado de Trip', {
      description: '50,00 voltaram para o saldo livre de Main.',
      duration: 4000,
    })
  })

  it('still moves when the piggy bank is not in the list anymore', async () => {
    vi.mocked(compartmentsApi.move).mockResolvedValue({} as never)
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Resgatar').trigger('click')
    wrapper
      .getComponent(CompartmentMovementDialog)
      .vm.$emit('move', 'gone', { direction: 'WITHDRAWAL', value: 1, note: null })
    await flushPromises()

    expect(toast.success).toHaveBeenCalledTimes(1)
  })

  it('shows the refusal of a withdrawal under the value field and keeps the dialog open', async () => {
    vi.mocked(compartmentsApi.move).mockRejectedValue(
      problem(400, { error: 'insufficient-compartment-balance', parameters: { balance: 1000 } }),
    )
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Resgatar').trigger('click')
    const dialog = wrapper.getComponent(CompartmentMovementDialog)
    dialog.vm.$emit('move', 'k-1', { direction: 'WITHDRAWAL', value: 5000, note: null })
    await flushPromises()

    expect(dialog.props('fieldErrors').value).toMatch(
      /passa do saldo do cofrinho, que é R\$\s?1\.000,00/,
    )
    expect(dialog.props('request')).not.toBeNull()
  })

  it('closes the movement dialog', async () => {
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Guardar').trigger('click')
    wrapper.getComponent(CompartmentMovementDialog).vm.$emit('close')
    await flushPromises()

    expect(wrapper.getComponent(CompartmentMovementDialog).props('request')).toBeNull()
  })
})
