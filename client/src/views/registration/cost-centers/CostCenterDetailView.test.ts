import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { costCentersApi } from '@/api/costCenters'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, problem } from '@/test/crud'
import type { CostCenterView } from '@/types'
import CostCenterDetailView from '@/views/registration/cost-centers/CostCenterDetailView.vue'

vi.mock('@/api/costCenters')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const costCenter: CostCenterView = {
  id: 'cc-2',
  name: 'Kitchen',
  active: true,
  description: null,
  incomeBudget: 100,
  expenseBudget: null,
  parentCostCenter: {
    id: 'cc-1',
    name: 'Home',
    fullName: 'Home',
    active: true,
    incomeBudget: null,
    expenseBudget: null,
  },
}

async function render(view: CostCenterView = costCenter) {
  vi.mocked(costCentersApi.findById).mockResolvedValue(view)
  return mountView(CostCenterDetailView, 'cost-centers', { id: 'cc-2' })
}

describe('CostCenterDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the cost center with its parent', async () => {
    const { wrapper } = await render()

    expect(costCentersApi.findById).toHaveBeenCalledWith('cc-2')
    expect(wrapper.text()).toContain('Detalhando centro de custo')
    expect(wrapper.text()).toContain('Ativo')
    expect(wrapper.text()).toContain('Kitchen')
    expect(wrapper.text()).toContain('Home')
    expect(wrapper.text()).toContain('100,00')
    expect(wrapper.text()).toMatch(/R\$\s0,00/)
  })

  it('shows a placeholder when there is no parent', async () => {
    const { wrapper } = await render({ ...costCenter, parentCostCenter: null })

    expect(wrapper.text()).toContain('---')
  })

  it('goes to the listing and to the edit form', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Editar').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('cost-centers.update')

    await buttonWithText(wrapper, 'Voltar').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('cost-centers')
  })

  it('deletes after confirmation and goes to the listing', async () => {
    const { wrapper, router } = await render()
    vi.mocked(costCentersApi.remove).mockResolvedValue(undefined)

    await buttonWithText(wrapper, 'Excluir').trigger('click')
    useConfirmDialog().accept()
    await flushPromises()

    expect(costCentersApi.remove).toHaveBeenCalledWith('cc-2')
    expect(toast.success).toHaveBeenCalledWith('Registro excluído', {
      description: 'Centro de custo excluído com sucesso',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).toBe('cost-centers')
  })

  it('shows the server error when the deletion fails', async () => {
    const { wrapper } = await render()
    vi.mocked(costCentersApi.remove).mockRejectedValue(
      problem(400, { error: 'data-integrity-violation' }),
    )

    await buttonWithText(wrapper, 'Excluir').trigger('click')
    useConfirmDialog().accept()
    await flushPromises()

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'vinculado a outros registros',
    )
  })

  it('shows the server error when the cost center cannot be loaded', async () => {
    vi.mocked(costCentersApi.findById).mockRejectedValue(problem(404))

    const { wrapper } = await mountView(CostCenterDetailView, 'cost-centers', { id: 'x' })

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'O recurso solicitado não existe',
    )
  })
})
