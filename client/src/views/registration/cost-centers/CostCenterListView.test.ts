import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { costCentersApi } from '@/api/costCenters'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, pageOf, problem } from '@/test/crud'
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

async function render() {
  vi.mocked(costCentersApi.findAll).mockResolvedValue(pageOf(costCenters))
  return mountView(CostCenterListView, 'cost-centers')
}

describe('CostCenterListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('loads the active cost centers sorted by full name and lists them', async () => {
    const { wrapper } = await render()

    expect(costCentersApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', sort: 'fullName,asc' }),
    )
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('1.000,00')
    expect(rows[1]!.text()).toContain('Home > Kitchen')
    expect(rows[1]!.text()).toContain('250,00')
  })

  it('searches by the typed filter and by status', async () => {
    const { wrapper } = await render()

    await wrapper.find('input').setValue('Kit')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(costCentersApi.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ filter: 'Kit' }),
    )

    await buttonWithText(wrapper, 'Inativos').trigger('click')
    await flushPromises()
    expect(costCentersApi.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'INACTIVE' }),
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
    expect(router.currentRoute.value.name).toBe('cost-centers.create')

    await wrapper.findAll('button[aria-label="Editar"]')[1]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('cost-centers.update')
    expect(router.currentRoute.value.params.id).toBe('cc-2')

    await wrapper.findAll('tbody tr')[0]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('cost-centers.detail')
    expect(router.currentRoute.value.params.id).toBe('cc-1')
  })

  it('deletes a cost center after confirmation', async () => {
    const { wrapper } = await render()
    vi.mocked(costCentersApi.remove).mockResolvedValue(undefined)

    await wrapper.findAll('button[aria-label="Deletar"]')[1]!.trigger('click')
    useConfirmDialog().accept()
    await flushPromises()

    expect(costCentersApi.remove).toHaveBeenCalledWith('cc-2')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(toast.success).toHaveBeenCalledWith('Registro excluído', {
      description: 'Centro de custo excluído com sucesso',
      duration: 4000,
    })
  })

  it('keeps the cost center when the deletion is not confirmed', async () => {
    const { wrapper } = await render()

    await wrapper.findAll('button[aria-label="Deletar"]')[0]!.trigger('click')
    useConfirmDialog().cancel()
    await flushPromises()

    expect(costCentersApi.remove).not.toHaveBeenCalled()
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('shows the server error when the deletion fails', async () => {
    const { wrapper } = await render()
    vi.mocked(costCentersApi.remove).mockRejectedValue(
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
