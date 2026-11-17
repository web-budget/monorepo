import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { classificationsApi } from '@/api/classifications'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, pageOf, problem } from '@/test/crud'
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

async function render() {
  vi.mocked(classificationsApi.findAll).mockResolvedValue(pageOf(classifications))
  return mountView(ClassificationListView, 'classifications')
}

describe('ClassificationListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('loads the active classifications and lists them with type and budget', async () => {
    const { wrapper } = await render()

    expect(classificationsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', sort: 'createdOn,asc' }),
    )
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('Salary')
    expect(rows[0]!.text()).toContain('Receita')
    expect(rows[0]!.text()).toContain('R$')
    expect(rows[0]!.text()).toContain('1.500,00')
    expect(rows[1]!.text()).toContain('Despesa')
  })

  it('searches by the typed filter and sorts by the budget', async () => {
    const { wrapper } = await render()

    await wrapper.find('input').setValue('Sal')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(classificationsApi.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ filter: 'Sal' }),
    )

    await buttonWithText(wrapper, 'Orçamento').trigger('click')
    await flushPromises()

    expect(classificationsApi.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: 'budget,asc' }),
    )
  })

  it('clears the filter and reloads', async () => {
    const { wrapper } = await render()

    await wrapper.find('input').setValue('abc')
    await wrapper.find('button[aria-label="Limpar filtro"]').trigger('click')
    await flushPromises()

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
  })

  it('navigates to the form, the detail and the edit form', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Novo').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('classifications.create')

    await wrapper.findAll('button[aria-label="Editar"]')[1]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('classifications.update')
    expect(router.currentRoute.value.params.id).toBe('c-2')

    await wrapper.findAll('tbody tr')[0]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('classifications.detail')
    expect(router.currentRoute.value.params.id).toBe('c-1')
  })

  it('deletes a classification after confirmation', async () => {
    const { wrapper } = await render()
    vi.mocked(classificationsApi.remove).mockResolvedValue(undefined)

    await wrapper.findAll('button[aria-label="Deletar"]')[0]!.trigger('click')
    useConfirmDialog().accept()
    await flushPromises()

    expect(classificationsApi.remove).toHaveBeenCalledWith('c-1')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(toast.success).toHaveBeenCalledWith('Registro excluído', {
      description: 'Classificação excluída com sucesso',
      duration: 4000,
    })
  })

  it('keeps the classification when the deletion is not confirmed', async () => {
    const { wrapper } = await render()

    await wrapper.findAll('button[aria-label="Deletar"]')[0]!.trigger('click')
    useConfirmDialog().cancel()
    await flushPromises()

    expect(classificationsApi.remove).not.toHaveBeenCalled()
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('shows the server error when the deletion fails', async () => {
    const { wrapper } = await render()
    vi.mocked(classificationsApi.remove).mockRejectedValue(
      problem(400, { error: 'data-integrity-violation' }),
    )

    await wrapper.findAll('button[aria-label="Deletar"]')[0]!.trigger('click')
    useConfirmDialog().accept()
    await flushPromises()

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'vinculado a outros registros',
    )
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })
})
