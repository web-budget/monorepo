import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { classificationsApi } from '@/api/classifications'
import { Select } from '@/components/ui/select'
import { buttonWithText, mountView, problem, settle } from '@/test/crud'
import type { ClassificationView } from '@/types'
import ClassificationFormView from '@/views/registration/classifications/ClassificationFormView.vue'

vi.mock('@/api/classifications')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

type Wrapper = Awaited<ReturnType<typeof mountView>>['wrapper']

const existing: ClassificationView = {
  id: 'c-1',
  name: 'Salary',
  type: 'INCOME',
  active: true,
  budget: 1500,
  description: 'Monthly',
}

function field(wrapper: Wrapper, name: string) {
  return wrapper.find(`[name="${name}"]`)
}

async function submit(wrapper: Wrapper) {
  await wrapper.find('form').trigger('submit')
  await settle()
}

describe('ClassificationFormView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('asks for the required fields', async () => {
    const { wrapper } = await mountView(ClassificationFormView, 'classifications')

    expect(wrapper.text()).toContain('Nova classificação')
    await submit(wrapper)

    expect(wrapper.text()).toContain('Campo obrigatório')
    expect(classificationsApi.create).not.toHaveBeenCalled()
  })

  it('creates a classification and clears the form', async () => {
    vi.mocked(classificationsApi.create).mockResolvedValue(undefined)
    const { wrapper } = await mountView(ClassificationFormView, 'classifications')

    await field(wrapper, 'name').setValue('Salary')
    wrapper.getComponent(Select).vm.$emit('update:modelValue', 'INCOME')
    await field(wrapper, 'budget').setValue('1500.5')
    await submit(wrapper)

    expect(classificationsApi.create).toHaveBeenCalledWith({
      name: 'Salary',
      type: 'INCOME',
      budget: 1500.5,
      description: null,
    })
    expect(toast.success).toHaveBeenCalledWith('Registro criado', {
      description: 'Classificação criada com sucesso',
      duration: 4000,
    })
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('')
  })

  it('sends no budget when the field is left empty', async () => {
    vi.mocked(classificationsApi.create).mockResolvedValue(undefined)
    const { wrapper } = await mountView(ClassificationFormView, 'classifications')

    await field(wrapper, 'name').setValue('Salary')
    wrapper.getComponent(Select).vm.$emit('update:modelValue', 'EXPENSE')
    await submit(wrapper)

    expect(classificationsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'EXPENSE', budget: null }),
    )
  })

  it('shows the server error inside the form', async () => {
    vi.mocked(classificationsApi.create).mockRejectedValue(
      problem(409, { error: 'conflict', parameters: { 'classification.name': 'Salary' } }),
    )
    const { wrapper } = await mountView(ClassificationFormView, 'classifications')

    await field(wrapper, 'name').setValue('Salary')
    wrapper.getComponent(Select).vm.$emit('update:modelValue', 'INCOME')
    await submit(wrapper)

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'Nome "Salary" já esta em uso',
    )
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('loads a classification for editing with the type locked', async () => {
    vi.mocked(classificationsApi.findById).mockResolvedValue(existing)

    const { wrapper } = await mountView(ClassificationFormView, 'classifications', { id: 'c-1' })

    expect(wrapper.text()).toContain('Editando classificação')
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('Salary')
    expect((field(wrapper, 'budget').element as HTMLInputElement).value).toBe('1500')
    expect(wrapper.find('button[role="combobox"]').attributes('disabled')).toBeDefined()
  })

  it('saves the changes and the status', async () => {
    vi.mocked(classificationsApi.findById).mockResolvedValue(existing)
    vi.mocked(classificationsApi.update).mockResolvedValue(existing)
    const { wrapper } = await mountView(ClassificationFormView, 'classifications', { id: 'c-1' })

    await field(wrapper, 'name').setValue('Bonus')
    await buttonWithText(wrapper, 'Inativo').trigger('click')
    await submit(wrapper)

    expect(classificationsApi.update).toHaveBeenCalledWith('c-1', {
      name: 'Bonus',
      active: false,
      budget: 1500,
      description: 'Monthly',
    })
    expect(toast.success).toHaveBeenCalledWith('Registro atualizado', {
      description: 'Classificação atualizada com sucesso',
      duration: 4000,
    })
  })

  it('shows the server error when the update is rejected', async () => {
    vi.mocked(classificationsApi.findById).mockResolvedValue(existing)
    vi.mocked(classificationsApi.update).mockRejectedValue(problem(422))
    const { wrapper } = await mountView(ClassificationFormView, 'classifications', { id: 'c-1' })

    await submit(wrapper)

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'Revise os dados e tente novamente',
    )
  })

  it('goes back to the listing', async () => {
    const { wrapper, router } = await mountView(ClassificationFormView, 'classifications')

    await buttonWithText(wrapper, 'Voltar').trigger('click')
    await settle()

    expect(router.currentRoute.value.name).toBe('classifications')
  })
})
