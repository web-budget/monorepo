import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { costCentersApi } from '@/api/costCenters'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import {
  buttonWithText,
  chooseRowAction,
  listingCalls,
  mountView,
  problem,
  serveListing,
  stateOf,
  useCompactViewport,
} from '@/test/crud'
import type { CostCenterListView as CostCenterRow } from '@/types'
import CostCenterListView from '@/views/registration/cost-centers/CostCenterListView.vue'

vi.mock('@/api/costCenters')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const costCenters: CostCenterRow[] = [
  {
    id: 'cc-1',
    name: 'Home',
    fullName: 'Home',
    active: true,
    incomeBudget: 1000,
    expenseBudget: null,
  },
  {
    id: 'cc-2',
    name: 'Kitchen',
    fullName: 'Home > Kitchen',
    active: true,
    incomeBudget: null,
    expenseBudget: 250,
  },
]

async function render(content = costCenters, counts?: Record<string, number>) {
  serveListing(vi.mocked(costCentersApi.findAll), content, content.length, counts)
  return mountView(CostCenterListView, 'cost-centers')
}

describe('CostCenterListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  afterEach(() => {
    useCompactViewport(false)
    vi.restoreAllMocks()
  })

  it('introduces the page and offers the active cost centers first, with the counts', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Centros de custos')
    expect(wrapper.find('[data-slot="page-actions"]').text()).toBe('Criar')
    expect(wrapper.findAll('[aria-pressed]').map((button) => button.text())).toEqual([
      'Ativos 4',
      'Inativos 1',
      'Todos 5',
    ])
  })

  it('loads the active cost centers by full name, A to Z, and lists them with the budgets aligned to the right', async () => {
    const { wrapper } = await render()

    expect(costCentersApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', sort: 'fullName,asc' }),
    )
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('1.000,00')
    expect(rows[1]!.text()).toContain('Home > Kitchen')
    expect(rows[1]!.text()).toContain('250,00')
    expect(rows[1]!.find('a').attributes('href')).toBe('/cost-centers/cc-2/detail')
    expect(rows[0]!.findAll('td')[1]!.classes()).toContain('text-right')
  })

  it.each([
    ['the table', false],
    ['the mobile cards', true],
  ])(
    'shows zero for the budgets the server leaves out, without console warnings, on %s',
    async (_layout, compact) => {
      useCompactViewport(compact)
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const withoutBudgets: CostCenterRow = {
        id: 'cc-3',
        name: 'Garage',
        fullName: 'Garage',
        active: true,
      }

      const { wrapper } = await render([withoutBudgets])

      expect(warn).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('Garage')
      const budgets = wrapper.findAll('[data-slot="currency"]')
      expect(budgets).toHaveLength(2)
      budgets.forEach((budget) => expect(budget.text()).toMatch(/^R\$\s0,00$/))
    },
  )

  it('searches by the typed filter and by status', async () => {
    const { wrapper } = await render()

    await wrapper.find('input').setValue('Kit')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(listingCalls(vi.mocked(costCentersApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ filter: 'Kit', page: 0 }),
    )

    await buttonWithText(wrapper, 'Inativos').trigger('click')
    await flushPromises()
    expect(listingCalls(vi.mocked(costCentersApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ status: 'INACTIVE' }),
    )
  })

  it('marks the full name as sorted ascending without putting the default order in the URL', async () => {
    const { wrapper, router } = await render()

    expect(
      wrapper
        .findAll('th')
        .find((header) => header.text() === 'Nome')!
        .attributes('aria-sort'),
    ).toBe('ascending')
    expect(router.currentRoute.value.query).toEqual({})
  })

  it('toggles the full name order from the header and keeps the choice in the URL', async () => {
    const { wrapper, router } = await render()
    const sorted = () => listingCalls(vi.mocked(costCentersApi.findAll)).slice(-1)[0]

    await buttonWithText(wrapper, 'Nome').trigger('click')
    await flushPromises()
    expect(sorted()).toEqual(expect.objectContaining({ sort: 'fullName,desc' }))
    expect(router.currentRoute.value.query).toEqual({ sort: 'fullName,desc' })

    await buttonWithText(wrapper, 'Nome').trigger('click')
    await flushPromises()
    expect(sorted()).toEqual(expect.objectContaining({ sort: 'fullName,asc' }))
    expect(router.currentRoute.value.query).toEqual({})
  })

  it('sorts by the full name and clears the search', async () => {
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Nome').trigger('click')
    await flushPromises()
    expect(listingCalls(vi.mocked(costCentersApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ sort: 'fullName,desc' }),
    )

    await wrapper.find('input').setValue('abc')
    await wrapper.find('button[aria-label="Limpar filtro"]').trigger('click')
    await flushPromises()
    expect(listingCalls(vi.mocked(costCentersApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ filter: '' }),
    )
  })

  it('navigates to the form, the detail and the edit form', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Criar').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('cost-centers.create')

    await chooseRowAction(wrapper, 1, 'Editar')
    expect(router.currentRoute.value.name).toBe('cost-centers.update')
    expect(router.currentRoute.value.params.id).toBe('cc-2')

    await wrapper.findAll('tbody tr')[0]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('cost-centers.detail')
    expect(router.currentRoute.value.params.id).toBe('cc-1')
  })

  it('removes a cost center after confirmation, naming it', async () => {
    const { wrapper } = await render()
    vi.mocked(costCentersApi.remove).mockResolvedValue(undefined)
    const dialog = useConfirmDialog()

    await chooseRowAction(wrapper, 1, 'Excluir')
    expect(dialog.state.options.title).toBe('Excluir o centro de custo “Kitchen”?')
    dialog.accept()
    await flushPromises()

    expect(costCentersApi.remove).toHaveBeenCalledWith('cc-2')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(toast.success).toHaveBeenCalledWith('Centro de custo excluído', {
      description: '“Kitchen” saiu da lista.',
      duration: 4000,
    })
  })

  it('keeps the cost center when the removal is not confirmed', async () => {
    const { wrapper } = await render()

    await chooseRowAction(wrapper, 0, 'Excluir')
    useConfirmDialog().cancel()
    await flushPromises()

    expect(costCentersApi.remove).not.toHaveBeenCalled()
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('shows the server error when the removal fails', async () => {
    const { wrapper } = await render()
    vi.mocked(costCentersApi.remove).mockRejectedValue(
      problem(400, { error: 'data-integrity-violation' }),
    )

    await chooseRowAction(wrapper, 0, 'Excluir')
    useConfirmDialog().accept()
    await flushPromises()

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'vinculado a outros registros',
    )
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('invites the user to create the first cost center when none exists', async () => {
    const { wrapper, router } = await render([], { ACTIVE: 0, INACTIVE: 0, ALL: 0 })

    expect(wrapper.find('[data-state="empty"]').text()).toContain('Nenhum centro de custo ainda')

    await wrapper.find('[data-state="empty"] button').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('cost-centers.create')
  })

  it('says nothing matched the search, and shows the error state with a retry', async () => {
    const { wrapper } = await render([])
    await wrapper.find('input').setValue('zzz')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(wrapper.find('[data-state="no-result"]').text()).toContain('Nada encontrado para “zzz”')

    await wrapper.find('[data-state="no-result"] button').trigger('click')
    await flushPromises()
    expect(listingCalls(vi.mocked(costCentersApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ filter: '' }),
    )

    vi.mocked(costCentersApi.findAll).mockRejectedValue(problem(500))
    await wrapper.find('input').setValue('zzz')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(wrapper.find('[data-state="error"]').text()).toContain(
      'Não foi possível carregar os centros de custo',
    )

    serveListing(vi.mocked(costCentersApi.findAll), costCenters)
    await wrapper.find('[data-state="error"] button').trigger('click')
    await flushPromises()
    expect(stateOf(wrapper)).toBeUndefined()
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('opens with the state of the URL, which stays there', async () => {
    const location = '/cost-centers?filter=Ab&status=INACTIVE&page=2&size=30&sort=fullName,desc'
    serveListing(vi.mocked(costCentersApi.findAll), costCenters, 70)

    const { router } = await mountView(CostCenterListView, 'cost-centers', {}, {}, location)

    expect(listingCalls(vi.mocked(costCentersApi.findAll))[0]).toEqual({
      filter: 'Ab',
      status: 'INACTIVE',
      page: 1,
      size: 30,
      sort: 'fullName,desc',
    })
    expect(router.currentRoute.value.fullPath).toBe(location)
  })
})
