import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { settingsApi } from '@/api/settings'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, problem, settle } from '@/test/crud'
import SettingsView from '@/views/configuration/settings/SettingsView.vue'

vi.mock('@/api/settings')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

type Wrapper = Awaited<ReturnType<typeof mountView>>['wrapper']

function monthsField(wrapper: Wrapper) {
  return wrapper.find<HTMLInputElement>('input[name="reserveMonths"]')
}

async function submit(wrapper: Wrapper) {
  await wrapper.find('form').trigger('submit')
  await settle()
}

async function render(reserveMonths = 6) {
  vi.mocked(settingsApi.find).mockResolvedValue({ reserveMonths })
  return mountView(SettingsView, 'settings')
}

describe('SettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the title, the Reserva section and the current value, with no help text', async () => {
    const { wrapper } = await render(8)

    expect(wrapper.find('h1').text()).toBe('Parâmetros')
    expect(wrapper.find('[data-slot="page-description"]').exists()).toBe(false)
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual(['Reserva'])
    expect(wrapper.find('label').text()).toContain('Meses da reserva ideal')
    expect(wrapper.find('label').text()).toContain('*')
    expect(monthsField(wrapper).element.value).toBe('8')
    expect(monthsField(wrapper).attributes('min')).toBe('1')
    expect(monthsField(wrapper).attributes('max')).toBe('24')
    expect(buttonWithText(wrapper, 'Salvar')).toBeDefined()
    expect(wrapper.text()).not.toContain('Alterações não salvas')
    expect(settingsApi.find).toHaveBeenCalledOnce()
  })

  it('saves the new value, thanks with the toast and stays on the screen, clean', async () => {
    vi.mocked(settingsApi.update).mockResolvedValue({ reserveMonths: 12 })
    const { wrapper, router } = await render()

    await monthsField(wrapper).setValue(12)
    await settle()
    expect(wrapper.text()).toContain('Alterações não salvas')
    await submit(wrapper)

    expect(settingsApi.update).toHaveBeenCalledWith({ reserveMonths: 12 })
    expect(toast.success).toHaveBeenCalledWith('Parâmetros salvos', {
      description: 'A reserva ideal passa a ser de 12 meses de custo de vida.',
      duration: 4000,
    })
    expect(monthsField(wrapper).element.value).toBe('12')
    expect(wrapper.text()).not.toContain('Alterações não salvas')
    expect(router.currentRoute.value.name).not.toBe('settings')
    expect(wrapper.find('h1').text()).toBe('Parâmetros')
  })

  it('uses the singular for a single month', async () => {
    vi.mocked(settingsApi.update).mockResolvedValue({ reserveMonths: 1 })
    const { wrapper } = await render()

    await monthsField(wrapper).setValue(1)
    await submit(wrapper)

    expect(toast.success).toHaveBeenCalledWith('Parâmetros salvos', {
      description: 'A reserva ideal passa a ser de 1 mês de custo de vida.',
      duration: 4000,
    })
  })

  it.each([
    ['0', 'Use um número inteiro de 1 a 24.'],
    ['25', 'Use um número inteiro de 1 a 24.'],
    ['', 'Campo obrigatório'],
  ])('refuses %j under the field and focuses it', async (typed, message) => {
    const { wrapper } = await render()

    await monthsField(wrapper).setValue(typed)
    await submit(wrapper)

    expect(wrapper.text()).toContain(message)
    expect(monthsField(wrapper).attributes('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(monthsField(wrapper).element)
    expect(settingsApi.update).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('keeps the screen and shows the server error on top when the save is rejected', async () => {
    vi.mocked(settingsApi.update).mockRejectedValue(
      problem(400, { error: 'field-validation-failed' }),
    )
    const { wrapper } = await render()

    await monthsField(wrapper).setValue(12)
    await submit(wrapper)

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'Alguma informação está ausente ou inválida',
    )
    expect(toast.success).not.toHaveBeenCalled()
    expect(monthsField(wrapper).element.value).toBe('12')
    expect(wrapper.text()).toContain('Alterações não salvas')
  })

  it('shows the server error when the settings cannot be loaded', async () => {
    vi.mocked(settingsApi.find).mockRejectedValue(problem(500))

    const { wrapper } = await mountView(SettingsView, 'settings')

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
    expect(monthsField(wrapper).element.value).toBe('')
  })

  it('puts the saved value back with Cancelar, without leaving the screen', async () => {
    const { wrapper, router } = await render()
    await monthsField(wrapper).setValue(20)
    await settle()

    await buttonWithText(wrapper, 'Cancelar').trigger('click')
    await settle()

    expect(monthsField(wrapper).element.value).toBe('6')
    expect(wrapper.text()).not.toContain('Alterações não salvas')
    expect(router.currentRoute.value.name).not.toBe('settings')
  })

  it('asks before leaving with unsaved changes and stays when told to keep editing', async () => {
    const { wrapper, router } = await render()
    await monthsField(wrapper).setValue(20)
    await settle()
    const dialog = useConfirmDialog()

    const leaving = router.push({ name: 'settings' })
    await flushPromises()

    expect(dialog.state.options.title).toBe('Sair sem salvar?')
    expect(dialog.state.options.description).toBe('Os dados informados vão se perder.')

    dialog.cancel()
    await leaving
    await settle()

    expect(router.currentRoute.value.name).not.toBe('settings')
    expect(monthsField(wrapper).element.value).toBe('20')
  })

  it('leaves without asking when nothing changed', async () => {
    const { router } = await render()

    await router.push({ name: 'settings' })

    expect(router.currentRoute.value.name).toBe('settings')
    expect(useConfirmDialog().state.open).toBe(false)
  })
})
