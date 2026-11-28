import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { costCentersApi } from '@/api/costCenters'
import { buttonWithText, mountView, pageOf, problem, settle } from '@/test/crud'
import type { CostCenterListView, CostCenterView } from '@/types'
import CostCenterFormView from '@/views/registration/cost-centers/CostCenterFormView.vue'

vi.mock('@/api/costCenters')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

type Wrapper = Awaited<ReturnType<typeof mountView>>['wrapper']

const home: CostCenterListView = {
  id: 'cc-1',
  name: 'Home',
  fullName: 'Home',
  active: true,
  incomeBudget: null,
  expenseBudget: null,
}

const kitchen: CostCenterView = {
  id: 'cc-2',
  name: 'Kitchen',
  active: true,
  description: 'Pots and pans',
  incomeBudget: 100,
  expenseBudget: 250.5,
  parentCostCenter: home,
}

function field(wrapper: Wrapper, name: string) {
  return wrapper.find(`[name="${name}"]`)
}

async function submit(wrapper: Wrapper) {
  await wrapper.find('form').trigger('submit')
  await settle()
}

async function searchParent(wrapper: Wrapper, query: string) {
  await wrapper.find('button[role="combobox"]').trigger('click')
  await settle()
  const search = document.body.querySelector<HTMLInputElement>(
    '[data-slot="popover-content"] input',
  )
  if (!search) {
    throw new Error('popover did not open')
  }
  search.value = query
  search.dispatchEvent(new Event('input'))
  await settle()
}

async function pickParent(wrapper: Wrapper, query: string, optionText: string) {
  await searchParent(wrapper, query)
  const option = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (candidate) => candidate.textContent?.trim() === optionText,
  )
  if (!option) {
    throw new Error(`no option "${optionText}"`)
  }
  option.click()
  await settle()
}

describe('CostCenterFormView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the title and asks for the name', async () => {
    const { wrapper } = await mountView(CostCenterFormView, 'cost-centers')

    expect(wrapper.find('h1').text()).toBe('Novo centro de custo')
    expect(buttonWithText(wrapper, 'Criar')).toBeDefined()
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual([
      'Identificação',
      'Orçamento',
    ])

    await submit(wrapper)

    expect(wrapper.text()).toContain('Campo obrigatório')
    expect(costCentersApi.create).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(field(wrapper, 'name').element)
  })

  it('creates a cost center under a parent found by name and stays on the cleared form', async () => {
    vi.mocked(costCentersApi.findAll).mockResolvedValue(pageOf([home]))
    vi.mocked(costCentersApi.create).mockResolvedValue('cc-9')
    const { wrapper, router } = await mountView(CostCenterFormView, 'cost-centers')

    await field(wrapper, 'name').setValue('Kitchen')
    await pickParent(wrapper, 'Ho', 'Home')
    await field(wrapper, 'incomeBudget').setValue('10000')
    await field(wrapper, 'description').setValue('Pots and pans')
    await submit(wrapper)

    expect(costCentersApi.findAll).toHaveBeenCalledWith({ filter: 'Ho', status: 'ACTIVE' })
    expect(costCentersApi.create).toHaveBeenCalledWith({
      name: 'Kitchen',
      description: 'Pots and pans',
      incomeBudget: 100,
      expenseBudget: null,
      parentCostCenter: 'cc-1',
    })
    expect(toast.success).toHaveBeenCalledWith('Centro de custo criado', {
      description: '“Kitchen” já aparece nos lançamentos.',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).not.toBe('cost-centers.detail')
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('')
    expect(document.activeElement).toBe(field(wrapper, 'name').element)
  })

  it('creates a top level cost center without a parent', async () => {
    vi.mocked(costCentersApi.create).mockResolvedValue('cc-9')
    const { wrapper } = await mountView(CostCenterFormView, 'cost-centers')

    await field(wrapper, 'name').setValue('Home')
    await submit(wrapper)

    expect(costCentersApi.create).toHaveBeenCalledWith({
      name: 'Home',
      description: null,
      incomeBudget: null,
      expenseBudget: null,
      parentCostCenter: null,
    })
  })

  it('shows the server error on top and marks the field in conflict', async () => {
    vi.mocked(costCentersApi.create).mockRejectedValue(
      problem(409, { error: 'conflict', parameters: { 'cost-center.name': 'Home' } }),
    )
    const { wrapper } = await mountView(CostCenterFormView, 'cost-centers')

    await field(wrapper, 'name').setValue('Home')
    await submit(wrapper)

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'Nome "Home" já está em uso',
    )
    expect(field(wrapper, 'name').attributes('aria-invalid')).toBe('true')
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('puts the status block first on edit, with its help and the switch', async () => {
    vi.mocked(costCentersApi.findById).mockResolvedValue(kitchen)

    const { wrapper } = await mountView(CostCenterFormView, 'cost-centers', { id: 'cc-2' })

    const sections = wrapper.findAll('form section')
    expect(sections.length).toBeGreaterThan(1)
    expect(sections[0]?.find('h2').text()).toBe('Situação')
    expect(sections[0]?.text()).toContain('Inativar para remover das listagens')
    expect(sections[0]?.text()).toContain('Ativo')
    expect(sections[0]?.find('button[role="switch"]').attributes('aria-checked')).toBe('true')
    expect(wrapper.findAll('button[role="switch"]')).toHaveLength(1)
  })

  it('has no status block on create: a new record is always active', async () => {
    const { wrapper } = await mountView(CostCenterFormView, 'cost-centers')

    expect(wrapper.findAll('form section h2').map((title) => title.text())).not.toContain(
      'Situação',
    )
    expect(wrapper.text()).not.toContain('Inativar para')
  })

  it('loads a cost center for editing with its parent shown by full name', async () => {
    vi.mocked(costCentersApi.findById).mockResolvedValue(kitchen)

    const { wrapper } = await mountView(CostCenterFormView, 'cost-centers', { id: 'cc-2' })

    expect(wrapper.find('h1').text()).toBe('Editar centro de custo')
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('Kitchen')
    expect((field(wrapper, 'expenseBudget').element as HTMLInputElement).value).toBe('250,50')
    expect(wrapper.find('button[role="combobox"]').text()).toContain('Home')
  })

  it('saves the changes keeping the parent and clears it on request', async () => {
    vi.mocked(costCentersApi.findById).mockResolvedValue(kitchen)
    vi.mocked(costCentersApi.update).mockResolvedValue(kitchen)
    const { wrapper, router } = await mountView(CostCenterFormView, 'cost-centers', { id: 'cc-2' })

    await submit(wrapper)
    expect(costCentersApi.update).toHaveBeenLastCalledWith('cc-2', {
      name: 'Kitchen',
      active: true,
      description: 'Pots and pans',
      incomeBudget: 100,
      expenseBudget: 250.5,
      parentCostCenter: 'cc-1',
    })
    expect(toast.success).toHaveBeenCalledWith('Alterações salvas', {
      description: '“Kitchen” foi atualizado.',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).toBe('cost-centers.detail')
  })

  it('clears the parent and the status on request', async () => {
    vi.mocked(costCentersApi.findById).mockResolvedValue(kitchen)
    vi.mocked(costCentersApi.update).mockResolvedValue(kitchen)
    const { wrapper } = await mountView(CostCenterFormView, 'cost-centers', { id: 'cc-2' })

    await wrapper.find('button[aria-label="Limpar seleção"]').trigger('click')
    await wrapper.find('button[role="switch"]').trigger('click')
    await submit(wrapper)

    expect(costCentersApi.update).toHaveBeenLastCalledWith(
      'cc-2',
      expect.objectContaining({ active: false, parentCostCenter: null }),
    )
  })

  it('does not offer the cost center itself as its parent', async () => {
    vi.mocked(costCentersApi.findById).mockResolvedValue(kitchen)
    vi.mocked(costCentersApi.findAll).mockResolvedValue(
      pageOf([home, { ...home, id: 'cc-2', name: 'Kitchen', fullName: 'Kitchen' }]),
    )
    const { wrapper } = await mountView(CostCenterFormView, 'cost-centers', { id: 'cc-2' })

    await searchParent(wrapper, 'Ki')

    const options = [...document.body.querySelectorAll('[role="option"]')].map((option) =>
      option.textContent?.trim(),
    )
    expect(options).toEqual(['Home'])
  })

  it('shows the server error when the update is rejected', async () => {
    vi.mocked(costCentersApi.findById).mockResolvedValue(kitchen)
    vi.mocked(costCentersApi.update).mockRejectedValue(problem(422))
    const { wrapper } = await mountView(CostCenterFormView, 'cost-centers', { id: 'cc-2' })

    await submit(wrapper)

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'Revise os dados e tente novamente',
    )
  })

  it('keeps the form editable while the parent is being searched', async () => {
    vi.mocked(costCentersApi.findAll).mockReturnValue(new Promise(() => undefined))
    const { wrapper } = await mountView(CostCenterFormView, 'cost-centers')

    await searchParent(wrapper, 'Ho')

    expect(wrapper.find('fieldset').attributes('disabled')).toBeUndefined()
  })

  it('shows the server error when the parent search fails', async () => {
    vi.mocked(costCentersApi.findAll).mockRejectedValue(problem(500))
    const { wrapper } = await mountView(CostCenterFormView, 'cost-centers')

    await searchParent(wrapper, 'Ho')

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'Tente novamente mais tarde',
    )
  })

  it('goes back to the listing with Cancelar', async () => {
    const { wrapper, router } = await mountView(CostCenterFormView, 'cost-centers')

    await buttonWithText(wrapper, 'Cancelar').trigger('click')
    await settle()

    expect(router.currentRoute.value.name).toBe('cost-centers')
  })
})
