import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { recurringMovementsApi } from '@/api/recurringMovements'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import {
  buttonWithText,
  chooseRowAction,
  mountView,
  pageOf,
  problem,
  settle,
  stateOf,
} from '@/test/crud'
import type { RecurringMovementQuery, RecurringMovementView } from '@/types'
import RecurringMovementListView from '@/views/financial/recurring/RecurringMovementListView.vue'

vi.mock('@/api/recurringMovements')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const rent = {
  id: 'r-1',
  name: 'Aluguel',
  type: 'EXPENSE',
  valueKind: 'FIXED',
  value: 1200,
  suggestedValue: 1200,
  installments: null,
  firstInstallment: 1,
  launchedInstallments: 4,
  nextInstallment: 5,
  finished: false,
  autoLaunch: true,
  active: true,
} as RecurringMovementView

const phone = {
  id: 'r-2',
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
} as RecurringMovementView

const energy = {
  id: 'r-3',
  name: 'Energia',
  type: 'EXPENSE',
  valueKind: 'VARIABLE',
  value: 180,
  suggestedValue: 210,
  installments: null,
  firstInstallment: 1,
  launchedInstallments: null,
  nextInstallment: 1,
  finished: false,
  autoLaunch: false,
  active: false,
} as RecurringMovementView

const counts = { active: 4, finished: 1, all: 5 }

function serve(content = [rent, phone, energy], total = content.length) {
  vi.mocked(recurringMovementsApi.findAll).mockImplementation((query: RecurringMovementQuery) => {
    if (query.size === 1) {
      const key = query.finished ? 'finished' : query.active ? 'active' : 'all'
      return Promise.resolve(pageOf([], counts[key]))
    }
    return Promise.resolve(pageOf(content, total))
  })
}

function listingCalls() {
  return vi
    .mocked(recurringMovementsApi.findAll)
    .mock.calls.map(([query]) => query)
    .filter((query) => query.size !== 1)
}

async function render(location?: string) {
  serve()
  return mountView(RecurringMovementListView, 'recurring-movements', {}, {}, location)
}

describe('RecurringMovementListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('introduces the page and counts the tabs', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Recorrentes')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe(
      'Modelos que lançam movimentos e compras a cada período.',
    )
    expect(wrapper.find('[data-slot="page-actions"]').text()).toBe('Lançar em loteNovo recorrente')
    expect(wrapper.find('a[href="/financial/recurring-movements/launch"]').exists()).toBe(true)
    expect(wrapper.find('input').attributes('placeholder')).toBe(
      'Nome, centro de custo ou classificação',
    )
    expect(wrapper.findAll('[aria-pressed]').map((button) => button.text())).toEqual([
      'Ativos 4',
      'Encerrados 1',
      'Todos 5',
    ])
  })

  it('loads the active and unfinished ones, newest first', async () => {
    await render()

    expect(listingCalls()[0]).toEqual(
      expect.objectContaining({ active: true, finished: false, sort: 'createdOn,desc' }),
    )
  })

  it('shows the value, the kind, the installments, the launch and the situation of each one', async () => {
    const { wrapper } = await render()

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(3)
    expect(rows[0]!.text()).toContain('Aluguel')
    expect(rows[0]!.text()).toMatch(/−\s*R\$\s*1\.200,00/)
    expect(rows[0]!.text()).toContain('Fixo')
    expect(rows[0]!.text()).toContain('Indeterminado')
    expect(rows[0]!.text()).toContain('Automático')
    expect(rows[0]!.text()).toContain('Ativo')
    expect(rows[0]!.find('a').attributes('href')).toBe('/recurring-movements/r-1/detail')
    expect(rows[1]!.text()).toContain('3/12')
    expect(rows[1]!.text()).toContain('Manual')
    expect(rows[2]!.text()).toContain('último')
    expect(rows[2]!.text()).toMatch(/R\$\s*210,00/)
    expect(rows[2]!.text()).toContain('Variável')
    expect(rows[2]!.text()).toContain('Inativo')
  })

  it('signs an income as a credit', async () => {
    serve([{ ...rent, type: 'INCOME' }])
    const { wrapper } = await mountView(RecurringMovementListView, 'recurring-movements')

    expect(wrapper.find('tbody tr').text()).toMatch(/\+\s*R\$\s*1\.200,00/)
  })

  it('searches with Enter, changes the tab and sorts by name and value', async () => {
    const { wrapper } = await render()

    await wrapper.find('input').setValue('cel')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(listingCalls().slice(-1)[0]).toEqual(expect.objectContaining({ filter: 'cel', page: 0 }))

    await buttonWithText(wrapper, 'Encerrados').trigger('click')
    await flushPromises()
    expect(listingCalls().slice(-1)[0]).toEqual(
      expect.objectContaining({ finished: true, active: undefined }),
    )

    await buttonWithText(wrapper, 'Todos').trigger('click')
    await flushPromises()
    expect(listingCalls().slice(-1)[0]).toEqual(
      expect.objectContaining({ finished: undefined, active: undefined }),
    )

    await buttonWithText(wrapper, 'Valor (R$)').trigger('click')
    await flushPromises()
    expect(listingCalls().slice(-1)[0]).toEqual(expect.objectContaining({ sort: 'value,asc' }))
  })

  it('filters by type, keeps it in the URL and clears it', async () => {
    const { wrapper, router } = await render()

    wrapper.findAllComponents(FilterSelect)[0]!.vm.$emit('update:modelValue', 'INCOME')
    await settle()

    expect(listingCalls().slice(-1)[0]).toEqual(expect.objectContaining({ type: 'INCOME' }))
    expect(router.currentRoute.value.query.type).toBe('INCOME')

    await buttonWithText(wrapper, 'Limpar').trigger('click')
    await settle()
    expect(listingCalls().slice(-1)[0]).toEqual(expect.objectContaining({ type: undefined }))
    expect(router.currentRoute.value.query.type).toBeUndefined()
  })

  it('ignores a type that does not exist in the URL', async () => {
    await render('/recurring-movements?type=BOGUS')

    expect(listingCalls()[0]).toEqual(expect.objectContaining({ type: undefined }))
  })

  it('opens the form, the edit form and the detail', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Novo recorrente').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('recurring-movements.create')

    await chooseRowAction(wrapper, 1, 'Editar')
    expect(router.currentRoute.value.name).toBe('recurring-movements.update')
    expect(router.currentRoute.value.params.id).toBe('r-2')

    await chooseRowAction(wrapper, 0, 'Detalhes')
    expect(router.currentRoute.value.name).toBe('recurring-movements.detail')
    expect(router.currentRoute.value.params.id).toBe('r-1')
  })

  it('offers the readjustment only for the fixed ones', async () => {
    const { wrapper } = await render()

    await wrapper
      .findAll('button[aria-label="Mais ações"]')[2]!
      .trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(
      [...document.body.querySelectorAll('[role="menuitem"]')].map((item) =>
        item.textContent?.trim(),
      ),
    ).toEqual(['Detalhes', 'Editar', 'Excluir'])
  })

  it('readjusts a fixed one and reloads', async () => {
    const { wrapper } = await render()
    vi.mocked(recurringMovementsApi.readjust).mockResolvedValue(rent)

    await chooseRowAction(wrapper, 0, 'Reajustar valor')
    expect(document.body.textContent).toContain('Reajustar “Aluguel”')
    expect(document.body.textContent).toContain('Vale a partir do próximo lançamento.')
    const value = document.body.querySelector<HTMLInputElement>('input[name="value"]')!
    value.value = '130000'
    value.dispatchEvent(new Event('input', { bubbles: true }))
    const reason = document.body.querySelector<HTMLInputElement>('input[name="reason"]')!
    reason.value = 'IPCA'
    reason.dispatchEvent(new Event('input', { bubbles: true }))
    await flushPromises()
    document
      .querySelector('[role="dialog"] form')!
      .dispatchEvent(new Event('submit', { cancelable: true }))
    await settle()

    expect(recurringMovementsApi.readjust).toHaveBeenCalledWith('r-1', {
      value: 1300,
      reason: 'IPCA',
    })
    expect(toast.success).toHaveBeenCalledWith('Valor reajustado', {
      description: 'O novo valor de “Aluguel” vale a partir do próximo lançamento.',
      duration: 4000,
    })
    expect(listingCalls()).toHaveLength(2)
  })

  it('removes one after confirmation', async () => {
    const { wrapper } = await render()
    vi.mocked(recurringMovementsApi.remove).mockResolvedValue(undefined)
    const dialog = useConfirmDialog()

    await chooseRowAction(wrapper, 0, 'Excluir')
    expect(dialog.state.options.title).toBe('Excluir “Aluguel”?')
    dialog.accept()
    await flushPromises()

    expect(recurringMovementsApi.remove).toHaveBeenCalledWith('r-1')
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    expect(toast.success).toHaveBeenCalledWith('Recorrente excluído', {
      description: '“Aluguel” saiu da lista.',
      duration: 4000,
    })
  })

  it('tells to deactivate when the recurring movement already has launches', async () => {
    const { wrapper } = await render()
    vi.mocked(recurringMovementsApi.remove).mockRejectedValue(
      problem(400, { error: 'recurring-movement-with-launches' }),
    )
    const dialog = useConfirmDialog()

    await chooseRowAction(wrapper, 0, 'Excluir')
    dialog.accept()
    await settle()

    expect(wrapper.find('[role="alert"]').text()).toContain('Desative-o para parar de lançar.')
    expect(toast.error).not.toHaveBeenCalled()
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
  })

  it('invites to create the first one, shows no result and the load error', async () => {
    vi.mocked(recurringMovementsApi.findAll).mockImplementation((query) =>
      Promise.resolve(pageOf([], query.size === 1 ? 0 : 0)),
    )
    const { wrapper, router } = await mountView(RecurringMovementListView, 'recurring-movements')
    expect(stateOf(wrapper)).toBe('empty')
    expect(wrapper.text()).toContain('Nenhum recorrente ainda')
    await buttonWithText(wrapper, 'Criar').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('recurring-movements.create')

    vi.mocked(recurringMovementsApi.findAll).mockImplementation((query) =>
      Promise.resolve(pageOf([], query.size === 1 ? 5 : 0)),
    )
    const searched = await mountView(RecurringMovementListView, 'recurring-movements')
    await searched.wrapper.find('input').setValue('zzz')
    await searched.wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(stateOf(searched.wrapper)).toBe('no-result')
    await buttonWithText(searched.wrapper, 'Limpar busca').trigger('click')
    await flushPromises()
    expect((searched.wrapper.find('input').element as HTMLInputElement).value).toBe('')
    await searched.wrapper.find('input').setValue('abc')
    await searched.wrapper.find('button[aria-label="Limpar filtro"]').trigger('click')
    await flushPromises()
    expect(listingCalls().slice(-1)[0]).toEqual(expect.objectContaining({ filter: undefined }))

    vi.mocked(recurringMovementsApi.findAll).mockRejectedValue(problem(500))
    const failed = await mountView(RecurringMovementListView, 'recurring-movements')
    expect(stateOf(failed.wrapper)).toBe('error')
    const calls = vi.mocked(recurringMovementsApi.findAll).mock.calls.length
    await buttonWithText(failed.wrapper, 'Tentar de novo').trigger('click')
    await flushPromises()
    expect(vi.mocked(recurringMovementsApi.findAll).mock.calls.length).toBeGreaterThan(calls)
  })

  it('closes the readjustment dialog with Escape', async () => {
    const { wrapper } = await render()

    await chooseRowAction(wrapper, 0, 'Reajustar valor')
    document
      .querySelector('[role="dialog"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })
})
