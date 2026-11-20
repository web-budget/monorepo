import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { classificationsApi } from '@/api/classifications'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import {
  buttonWithText,
  chooseRowAction,
  listingCalls,
  mountView,
  problem,
  serveListing,
  stateOf,
} from '@/test/crud'
import type { ClassificationListView as ClassificationRow } from '@/types'
import ClassificationListView from '@/views/registration/classifications/ClassificationListView.vue'

vi.mock('@/api/classifications')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const classifications: ClassificationRow[] = [
  { id: 'c-1', name: 'Salary', type: 'INCOME', active: true, budget: 1500 },
  { id: 'c-2', name: 'Rent', type: 'EXPENSE', active: true, budget: null },
]

async function render(content = classifications, counts?: Record<string, number>) {
  serveListing(vi.mocked(classificationsApi.findAll), content, content.length, counts)
  return mountView(ClassificationListView, 'classifications')
}

describe('ClassificationListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('introduces the page and offers the active classifications first, with the counts', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Classificações')
    expect(wrapper.find('[data-slot="page-actions"]').text()).toBe('Criar')
    expect(wrapper.findAll('[aria-pressed]').map((button) => button.text())).toEqual([
      'Ativas 4',
      'Inativas 1',
      'Todas 5',
    ])
  })

  it('loads the active classifications and lists them with type and budget aligned to the right', async () => {
    const { wrapper } = await render()

    expect(classificationsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', sort: 'createdOn,desc' }),
    )
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('Salary')
    expect(rows[0]!.text()).toContain('Receita')
    expect(rows[0]!.text()).toContain('R$')
    expect(rows[0]!.text()).toContain('1.500,00')
    expect(rows[1]!.text()).toContain('Despesa')
    expect(rows[0]!.findAll('td')[2]!.classes()).toContain('text-right')
    expect(rows[0]!.find('a').attributes('href')).toBe('/classifications/c-1/detail')
  })

  it('searches by the typed filter, filters by status and sorts by the budget', async () => {
    const { wrapper } = await render()

    await wrapper.find('input').setValue('Sal')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(listingCalls(vi.mocked(classificationsApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ filter: 'Sal', page: 0 }),
    )

    await buttonWithText(wrapper, 'Inativas').trigger('click')
    await flushPromises()
    expect(listingCalls(vi.mocked(classificationsApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ status: 'INACTIVE' }),
    )

    await buttonWithText(wrapper, 'Orçamento').trigger('click')
    await flushPromises()
    expect(listingCalls(vi.mocked(classificationsApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ sort: 'budget,asc' }),
    )
  })

  it('clears the search and reloads', async () => {
    const { wrapper } = await render()

    await wrapper.find('input').setValue('abc')
    await wrapper.find('button[aria-label="Limpar filtro"]').trigger('click')
    await flushPromises()

    expect(listingCalls(vi.mocked(classificationsApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ filter: '' }),
    )
  })

  it('navigates to the form, the detail and the edit form', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Criar').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('classifications.create')

    await chooseRowAction(wrapper, 1, 'Editar')
    expect(router.currentRoute.value.name).toBe('classifications.update')
    expect(router.currentRoute.value.params.id).toBe('c-2')

    await wrapper.findAll('tbody tr')[0]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('classifications.detail')
    expect(router.currentRoute.value.params.id).toBe('c-1')
  })

  it('removes a classification after confirmation, naming it', async () => {
    const { wrapper } = await render()
    vi.mocked(classificationsApi.remove).mockResolvedValue(undefined)
    const dialog = useConfirmDialog()

    await chooseRowAction(wrapper, 0, 'Remover')
    expect(dialog.state.options.title).toBe('Remover a classificação “Salary”?')
    dialog.accept()
    await flushPromises()

    expect(classificationsApi.remove).toHaveBeenCalledWith('c-1')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(toast.success).toHaveBeenCalledWith('Classificação removida', {
      description: '“Salary” saiu da lista.',
      duration: 4000,
    })
  })

  it('keeps the classification when the removal is not confirmed', async () => {
    const { wrapper } = await render()

    await chooseRowAction(wrapper, 0, 'Remover')
    useConfirmDialog().cancel()
    await flushPromises()

    expect(classificationsApi.remove).not.toHaveBeenCalled()
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('shows the server error when the removal fails', async () => {
    const { wrapper } = await render()
    vi.mocked(classificationsApi.remove).mockRejectedValue(
      problem(400, { error: 'data-integrity-violation' }),
    )

    await chooseRowAction(wrapper, 0, 'Remover')
    useConfirmDialog().accept()
    await flushPromises()

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'vinculado a outros registros',
    )
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('invites the user to create the first classification when none exists', async () => {
    const { wrapper, router } = await render([], { ACTIVE: 0, INACTIVE: 0, ALL: 0 })

    expect(wrapper.find('[data-state="empty"]').text()).toContain('Nenhuma classificação ainda')

    await wrapper.find('[data-state="empty"] button').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('classifications.create')
  })

  it('says nothing matched the search, and shows the error state with a retry', async () => {
    const { wrapper } = await render([])
    await wrapper.find('input').setValue('zzz')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(wrapper.find('[data-state="no-result"]').text()).toContain('Nada encontrado para “zzz”')

    await wrapper.find('[data-state="no-result"] button').trigger('click')
    await flushPromises()
    expect(listingCalls(vi.mocked(classificationsApi.findAll)).slice(-1)[0]).toEqual(
      expect.objectContaining({ filter: '' }),
    )

    vi.mocked(classificationsApi.findAll).mockRejectedValue(problem(500))
    await wrapper.find('input').setValue('zzz')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(wrapper.find('[data-state="error"]').text()).toContain(
      'Não foi possível carregar as classificações',
    )

    serveListing(vi.mocked(classificationsApi.findAll), classifications)
    await wrapper.find('[data-state="error"] button').trigger('click')
    await flushPromises()
    expect(stateOf(wrapper)).toBeUndefined()
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })
})
