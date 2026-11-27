import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { compartmentsApi } from '@/api/compartments'
import { walletsApi } from '@/api/wallets'
import CompartmentFormDialog from '@/components/compartments/CompartmentFormDialog.vue'
import CompartmentMovementDialog from '@/components/compartments/CompartmentMovementDialog.vue'
import DeleteCompartmentDialog from '@/components/compartments/DeleteCompartmentDialog.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import { buttonWithText, mountView, pageOf, problem } from '@/test/crud'
import type { CompartmentMovementView, CompartmentView, WalletView } from '@/types'
import CompartmentHistoryView from '@/views/registration/wallets/CompartmentHistoryView.vue'

vi.mock('@/api/wallets')
vi.mock('@/api/compartments')
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
  currentBalance: 50,
  totalBalance: 1100,
  compartmentCount: 1,
  active: true,
  description: null,
  bank: 'ACME',
  agency: '123',
  number: '456',
}

const trip: CompartmentView = {
  id: 'k-1',
  name: 'Trip',
  type: 'GOAL',
  balance: 1050,
  statementEntryCount: 2,
  achieved: false,
  overdue: false,
  description: 'Beach',
  targetValue: 1800,
  targetDate: '2027-02-10',
  progress: 0.5833,
  monthlyAmount: 187.5,
}

const movements: CompartmentMovementView[] = [
  {
    id: 'm-2',
    createdOn: '2026-11-26T10:05:00',
    direction: 'WITHDRAWAL',
    value: 200,
    previousBalance: 1250,
    resultingBalance: 1050,
    note: 'Car',
    entryId: 'e-2',
  },
  {
    id: 'm-1',
    createdOn: '2026-11-25T09:00:00',
    direction: 'DEPOSIT',
    value: 1250,
    previousBalance: 0,
    resultingBalance: 1250,
  },
]

async function render(options: {
  compartment?: CompartmentView
  walletView?: WalletView
  content?: CompartmentMovementView[]
  total?: number
  location?: string
} = {}) {
  vi.mocked(walletsApi.findById).mockResolvedValue(options.walletView ?? wallet)
  vi.mocked(compartmentsApi.findById).mockResolvedValue(options.compartment ?? trip)
  vi.mocked(compartmentsApi.findAll).mockResolvedValue([options.compartment ?? trip])
  const content = options.content ?? movements
  vi.mocked(compartmentsApi.findMovements).mockResolvedValue(pageOf(content, options.total))
  vi.mocked(compartmentsApi.findPosition).mockResolvedValue({ position: 17 })
  return mountView(
    CompartmentHistoryView,
    'wallets',
    { id: 'w-1', compartmentId: 'k-1' },
    {},
    options.location ?? '/c/w-1/k-1',
    [
      { path: '/c/:id/:compartmentId', name: 'wallets.compartments.detail', component: { render: () => null } },
      { path: '/s/:wallet/:id', name: 'statement.detail', component: { render: () => null } },
    ],
  )
}

describe('CompartmentHistoryView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the piggy bank, its goal and the wallet it belongs to', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Trip')
    expect(wrapper.text()).toContain('Objetivo')
    expect(wrapper.text()).toMatch(/R\$\s?1\.050,00/)
    expect(wrapper.find('a[href="/wallets/w-1/detail"]').text()).toBe('Main')
    expect(wrapper.text()).toContain('Beach')
    expect(wrapper.text()).toContain('58% de 1.800,00')
    expect(wrapper.text()).toContain('1.800,00')
    expect(wrapper.text()).toContain('10/02/2027')
  })

  it('lists the movements from the newest, with the balances of the piggy bank', async () => {
    const { wrapper } = await render()

    expect(compartmentsApi.findMovements).toHaveBeenCalledWith('w-1', 'k-1', {
      page: 0,
      size: 15,
      sort: 'createdOn,desc',
    })
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('26/11/2026 10:05')
    expect(rows[0]!.text()).toContain('Resgatado')
    expect(rows[0]!.text()).toContain('200,00')
    expect(rows[0]!.text()).toContain('Car')
    expect(rows[0]!.text()).toContain('1.250,00')
    expect(rows[0]!.text()).toContain('1.050,00')
    expect(rows[1]!.text()).toContain('Guardado')
    expect(rows[1]!.text()).toContain('—')
    expect(rows[0]!.find('.text-expense').exists()).toBe(true)
    expect(rows[1]!.find('.text-income').exists()).toBe(true)
  })

  it('opens the statement line from the origin of a movement that has one', async () => {
    const { wrapper, router } = await render()

    const rows = wrapper.findAll('tbody tr')
    expect(rows[1]!.find('button[aria-label="Abrir a linha no extrato"]').exists()).toBe(false)

    await rows[0]!.find('button[aria-label="Abrir a linha no extrato"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('statement.detail')
    expect(router.currentRoute.value.params).toEqual({ wallet: 'w-1', id: 'e-2' })
  })

  it('shows the empty state without movements', async () => {
    const { wrapper } = await render({ content: [] })

    expect(wrapper.text()).toContain('Nenhuma movimentação ainda')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('opens the page of the movement that came from the statement and marks it', async () => {
    const { wrapper, router } = await render({
      location: '/c/w-1/k-1?movement=m-2',
      total: 30,
    })

    expect(compartmentsApi.findPosition).toHaveBeenCalledWith('w-1', 'k-1', 'm-2', 'createdOn,desc')
    expect(compartmentsApi.findMovements).toHaveBeenCalledWith('w-1', 'k-1', {
      page: 1,
      size: 15,
      sort: 'createdOn,desc',
    })
    expect(router.currentRoute.value.query).toEqual({ movement: 'm-2', page: '2' })
    expect(wrapper.find('tbody tr[data-state="selected"]').exists()).toBe(true)
  })

  it('does not look for the movement when the URL already says the page', async () => {
    await render({ location: '/c/w-1/k-1?movement=m-2&page=3' })

    expect(compartmentsApi.findPosition).not.toHaveBeenCalled()
    expect(compartmentsApi.findMovements).toHaveBeenCalledWith('w-1', 'k-1', {
      page: 2,
      size: 15,
      sort: 'createdOn,desc',
    })
  })

  it('reloads when the page and the order change and keeps them on the URL', async () => {
    const { wrapper, router } = await render({ total: 40 })
    const table = wrapper.getComponent(ItemsTable)

    table.vm.$emit('pageChanged', { currentPage: 1, pageSize: 30 })
    await flushPromises()

    expect(compartmentsApi.findMovements).toHaveBeenLastCalledWith('w-1', 'k-1', {
      page: 1,
      size: 30,
      sort: 'createdOn,desc',
    })

    table.vm.$emit('tableSorted', { sortField: 'value', sortOrder: 'asc' })
    await flushPromises()

    expect(compartmentsApi.findMovements).toHaveBeenLastCalledWith('w-1', 'k-1', {
      page: 0,
      size: 30,
      sort: 'value,asc',
    })
    expect(router.currentRoute.value.query).toEqual({ size: '30', sort: 'value,asc' })
  })

  it('follows the URL when it changes outside the screen', async () => {
    const { router } = await render()

    await router.push('/c/w-1/k-1?page=2&size=30')
    await flushPromises()

    expect(compartmentsApi.findMovements).toHaveBeenLastCalledWith('w-1', 'k-1', {
      page: 1,
      size: 30,
      sort: 'createdOn,desc',
    })
  })

  it('leaves the goal section out of a reserve and the progress out of a goal without target', async () => {
    const reserve = await render({
      compartment: { ...trip, type: 'RESERVE', targetValue: null, targetDate: null },
    })

    expect(reserve.wrapper.text()).not.toContain('Valor alvo')
    reserve.wrapper.unmount()

    const open = await render({
      compartment: {
        ...trip,
        targetValue: null,
        targetDate: null,
        description: null,
        progress: null,
        monthlyAmount: null,
      },
    })

    expect(open.wrapper.text()).toContain('Valor alvo')
    expect(open.wrapper.text()).not.toContain('Progresso')
    expect(open.wrapper.text()).toContain('---')
  })

  it('shows the error when something cannot be loaded', async () => {
    vi.mocked(walletsApi.findById).mockRejectedValue(problem(404))
    vi.mocked(compartmentsApi.findById).mockResolvedValue(trip)
    vi.mocked(compartmentsApi.findAll).mockResolvedValue([trip])
    vi.mocked(compartmentsApi.findMovements).mockResolvedValue(pageOf([]))

    const { wrapper } = await mountView(CompartmentHistoryView, 'wallets', {
      id: 'w-1',
      compartmentId: 'k-1',
    })

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'O recurso solicitado não existe',
    )
  })

  it('freezes the actions of an inactive wallet', async () => {
    const { wrapper } = await render({ walletView: { ...wallet, active: false } })

    for (const label of ['Excluir', 'Editar', 'Guardar', 'Resgatar']) {
      expect(buttonWithText(wrapper, label).attributes('disabled')).toBeDefined()
    }
  })

  it('shows the title of the view while the piggy bank is not loaded yet', async () => {
    vi.mocked(walletsApi.findById).mockReturnValue(new Promise(() => undefined))
    vi.mocked(compartmentsApi.findById).mockReturnValue(new Promise(() => undefined))
    vi.mocked(compartmentsApi.findAll).mockReturnValue(new Promise(() => undefined))

    const { wrapper } = await mountView(CompartmentHistoryView, 'wallets', {
      id: 'w-1',
      compartmentId: 'k-1',
    })

    expect(wrapper.find('h1').text()).toBe('Detalhando')
    expect(buttonWithText(wrapper, 'Editar').attributes('disabled')).toBeDefined()
    expect(buttonWithText(wrapper, 'Excluir').attributes('disabled')).toBeDefined()
  })

  it('edits the piggy bank from the header and reloads', async () => {
    vi.mocked(compartmentsApi.update).mockResolvedValue(trip)
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Editar').trigger('click')
    const dialog = wrapper.getComponent(CompartmentFormDialog)
    expect(dialog.props('compartment')?.id).toBe('k-1')

    dialog.vm.$emit('submit', { name: 'Trip 2', type: 'GOAL' })
    await flushPromises()

    expect(compartmentsApi.update).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Cofrinho salvo', {
      description: 'Trip 2, em Main.',
      duration: 4000,
    })
    expect(compartmentsApi.findMovements).toHaveBeenCalledTimes(2)
  })

  it('deletes an empty piggy bank and goes back to the wallet', async () => {
    vi.mocked(compartmentsApi.remove).mockResolvedValue(undefined)
    const { wrapper, router } = await render({ compartment: { ...trip, balance: 0 } })

    await buttonWithText(wrapper, 'Excluir').trigger('click')
    wrapper.getComponent(DeleteCompartmentDialog).vm.$emit('confirm')
    await flushPromises()

    expect(compartmentsApi.remove).toHaveBeenCalledWith('w-1', 'k-1')
    expect(router.currentRoute.value.name).toBe('wallets.detail')
    expect(router.currentRoute.value.params.id).toBe('w-1')
  })

  it('saves and withdraws from the buttons of the card, with the piggy bank chosen', async () => {
    vi.mocked(compartmentsApi.move).mockResolvedValue({} as never)
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Guardar').trigger('click')
    expect(wrapper.getComponent(CompartmentMovementDialog).props('request')).toEqual({
      direction: 'DEPOSIT',
      compartmentId: 'k-1',
    })
    wrapper.getComponent(CompartmentMovementDialog).vm.$emit('close')

    await buttonWithText(wrapper, 'Resgatar').trigger('click')
    expect(wrapper.getComponent(CompartmentMovementDialog).props('request')?.direction).toBe(
      'WITHDRAWAL',
    )
    wrapper
      .getComponent(CompartmentMovementDialog)
      .vm.$emit('move', 'k-1', { direction: 'WITHDRAWAL', value: 10, note: null })
    await flushPromises()

    expect(toast.success).toHaveBeenCalledWith('Resgatado de Trip', {
      description: '10,00 voltaram para o saldo livre de Main.',
      duration: 4000,
    })
  })

  it('closes the form and the delete dialog', async () => {
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Editar').trigger('click')
    wrapper.getComponent(CompartmentFormDialog).vm.$emit('close')
    await buttonWithText(wrapper, 'Excluir').trigger('click')
    wrapper.getComponent(DeleteCompartmentDialog).vm.$emit('close')
    await flushPromises()

    expect(wrapper.getComponent(CompartmentFormDialog).props('open')).toBe(false)
    expect(wrapper.getComponent(DeleteCompartmentDialog).props('compartment')).toBeNull()
  })

  it('opens the withdrawal with everything when asked from the delete dialog', async () => {
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Excluir').trigger('click')
    wrapper.getComponent(DeleteCompartmentDialog).vm.$emit('withdrawAll')
    await flushPromises()

    expect(wrapper.getComponent(CompartmentMovementDialog).props('request')).toEqual({
      direction: 'WITHDRAWAL',
      compartmentId: 'k-1',
      value: 1050,
    })
  })
})
