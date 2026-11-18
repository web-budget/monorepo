import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { classificationsApi } from '@/api/classifications'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, problem } from '@/test/crud'
import type { ClassificationView } from '@/types'
import ClassificationDetailView from '@/views/registration/classifications/ClassificationDetailView.vue'

vi.mock('@/api/classifications')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const classification: ClassificationView = {
  id: 'c-1',
  name: 'Salary',
  type: 'INCOME',
  active: false,
  budget: 1500,
  description: null,
}

async function render() {
  vi.mocked(classificationsApi.findById).mockResolvedValue(classification)
  return mountView(ClassificationDetailView, 'classifications', { id: 'c-1' })
}

describe('ClassificationDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the classification', async () => {
    const { wrapper } = await render()

    expect(classificationsApi.findById).toHaveBeenCalledWith('c-1')
    expect(wrapper.text()).toContain('Detalhando classificação')
    expect(wrapper.text()).toContain('Inativo')
    expect(wrapper.text()).toContain('Salary')
    expect(wrapper.text()).toContain('Receita')
    expect(wrapper.text()).toContain('1.500,00')
    expect(wrapper.text()).toContain('---')
  })

  it('goes to the listing and to the edit form', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Editar').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('classifications.update')

    await buttonWithText(wrapper, 'Voltar').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('classifications')
  })

  it('deletes after confirmation and goes to the listing', async () => {
    const { wrapper, router } = await render()
    vi.mocked(classificationsApi.remove).mockResolvedValue(undefined)

    await buttonWithText(wrapper, 'Excluir').trigger('click')
    useConfirmDialog().accept()
    await flushPromises()

    expect(classificationsApi.remove).toHaveBeenCalledWith('c-1')
    expect(toast.success).toHaveBeenCalledWith('Registro excluído', {
      description: 'Classificação excluída com sucesso',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).toBe('classifications')
  })

  it('shows the server error when the deletion fails', async () => {
    const { wrapper } = await render()
    vi.mocked(classificationsApi.remove).mockRejectedValue(
      problem(400, { error: 'data-integrity-violation' }),
    )

    await buttonWithText(wrapper, 'Excluir').trigger('click')
    useConfirmDialog().accept()
    await flushPromises()

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'vinculado a outros registros',
    )
  })

  it('shows the server error when the classification cannot be loaded', async () => {
    vi.mocked(classificationsApi.findById).mockRejectedValue(problem(404))

    const { wrapper } = await mountView(ClassificationDetailView, 'classifications', { id: 'x' })

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'O recurso solicitado não existe',
    )
  })
})
