import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { walletsApi } from '@/api/wallets'
import { Select } from '@/components/ui/select'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, problem, settle } from '@/test/crud'
import type { WalletView } from '@/types'
import WalletFormView from '@/views/registration/wallets/WalletFormView.vue'

vi.mock('@/api/wallets')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const existing: WalletView = {
  id: 'w-1',
  name: 'Main',
  type: 'BANK_ACCOUNT',
  currentBalance: 10,
  active: true,
  description: 'Daily use',
  bank: 'ACME',
  agency: '123',
  number: '456',
}

type Wrapper = Awaited<ReturnType<typeof mountView>>['wrapper']

function field(wrapper: Wrapper, name: string) {
  return wrapper.find(`[name="${name}"]`)
}

async function chooseType(wrapper: Wrapper, type: string) {
  wrapper.getComponent(Select).vm.$emit('update:modelValue', type)
  await settle()
}

async function submit(wrapper: Wrapper) {
  await wrapper.find('form').trigger('submit')
  await settle()
}

describe('WalletFormView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  describe('creating', () => {
    it('shows the creation title, the required marks and no status toggle', async () => {
      const { wrapper } = await mountView(WalletFormView, 'wallets')

      expect(wrapper.find('h1').text()).toBe('Nova carteira')
      expect(wrapper.text()).toContain('Campos com * são obrigatórios.')
      expect(wrapper.find('button[role="switch"]').exists()).toBe(false)
      expect(wrapper.find('label[for]').text()).toContain('Nome*')
      expect(buttonWithText(wrapper, 'Criar carteira')).toBeDefined()
      expect(walletsApi.findById).not.toHaveBeenCalled()
    })

    it('asks for the required fields and puts the focus on the first one with an error', async () => {
      const { wrapper } = await mountView(WalletFormView, 'wallets')

      await submit(wrapper)
      await settle()

      expect(wrapper.text()).toContain('Campo obrigatório')
      expect(walletsApi.create).not.toHaveBeenCalled()
      expect(document.activeElement).toBe(field(wrapper, 'name').element)
    })

    it('validates a field when it loses the focus and then again on every change', async () => {
      const { wrapper } = await mountView(WalletFormView, 'wallets')
      const name = field(wrapper, 'name')

      await name.setValue('A')
      await settle()
      expect(wrapper.text()).not.toContain('Use pelo menos')

      await name.trigger('blur')
      await settle()
      expect(name.attributes('aria-invalid')).toBe('true')

      await name.setValue('Ab')
      await settle()
      expect(name.attributes('aria-invalid')).toBe('false')
    })

    it('shows the bank fields only for a bank account or an investment', async () => {
      const { wrapper } = await mountView(WalletFormView, 'wallets')

      expect(field(wrapper, 'bank').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('Dados do banco')

      await chooseType(wrapper, 'BANK_ACCOUNT')

      expect(field(wrapper, 'bank').exists()).toBe(true)
      expect(field(wrapper, 'agency').exists()).toBe(true)
      expect(field(wrapper, 'number').exists()).toBe(true)
      expect(wrapper.text()).toContain('Dados do banco')

      await chooseType(wrapper, 'PERSONAL')

      expect(field(wrapper, 'bank').exists()).toBe(false)
    })

    it('creates a bank account and goes to its detail', async () => {
      vi.mocked(walletsApi.create).mockResolvedValue('w-9')
      const { wrapper, router } = await mountView(WalletFormView, 'wallets')

      await field(wrapper, 'name').setValue('Main')
      await chooseType(wrapper, 'BANK_ACCOUNT')
      await field(wrapper, 'bank').setValue('ACME')
      await field(wrapper, 'agency').setValue('123')
      await field(wrapper, 'number').setValue('456')
      await field(wrapper, 'description').setValue('Daily use')
      await submit(wrapper)

      expect(walletsApi.create).toHaveBeenCalledWith({
        name: 'Main',
        type: 'BANK_ACCOUNT',
        bank: 'ACME',
        agency: '123',
        number: '456',
        description: 'Daily use',
      })
      expect(toast.success).toHaveBeenCalledWith('Carteira criada', {
        description: '“Main” já aparece nos lançamentos.',
        duration: 4000,
      })
      expect(router.currentRoute.value.name).toBe('wallets.detail')
      expect(router.currentRoute.value.params.id).toBe('w-9')
    })

    it('goes to the listing when the server does not say where the wallet is', async () => {
      vi.mocked(walletsApi.create).mockResolvedValue('')
      const { wrapper, router } = await mountView(WalletFormView, 'wallets')

      await field(wrapper, 'name').setValue('Cash')
      await chooseType(wrapper, 'PERSONAL')
      await submit(wrapper)

      expect(router.currentRoute.value.name).toBe('wallets')
    })

    it('drops the bank data of a personal wallet', async () => {
      vi.mocked(walletsApi.create).mockResolvedValue('w-9')
      const { wrapper } = await mountView(WalletFormView, 'wallets')

      await field(wrapper, 'name').setValue('Cash')
      await chooseType(wrapper, 'BANK_ACCOUNT')
      await field(wrapper, 'bank').setValue('ACME')
      await chooseType(wrapper, 'PERSONAL')
      await submit(wrapper)

      expect(walletsApi.create).toHaveBeenCalledWith({
        name: 'Cash',
        type: 'PERSONAL',
        bank: null,
        agency: null,
        number: null,
        description: null,
      })
    })

    it('shows the server error on top, marks the field and keeps the values, without a toast', async () => {
      vi.mocked(walletsApi.create).mockRejectedValue(
        problem(409, { error: 'conflict', parameters: { 'wallet.name': 'Main' } }),
      )
      const { wrapper } = await mountView(WalletFormView, 'wallets')

      await field(wrapper, 'name').setValue('Main')
      await chooseType(wrapper, 'PERSONAL')
      await submit(wrapper)

      const alert = wrapper.find('[data-slot="server-error"]')
      expect(alert.text()).toContain('Nome "Main" já esta em uso')
      expect(field(wrapper, 'name').attributes('aria-invalid')).toBe('true')
      expect(field(wrapper, 'name').attributes('aria-describedby')).toContain(
        alert.attributes('id'),
      )
      expect(wrapper.find('[data-slot="form-message"]').exists()).toBe(false)
      expect(toast.success).not.toHaveBeenCalled()
      expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('Main')

      await field(wrapper, 'name').setValue('Main 2')
      await settle()

      expect(field(wrapper, 'name').attributes('aria-invalid')).toBe('false')
    })

    it('clears the previous server error on the next attempt', async () => {
      vi.mocked(walletsApi.create).mockRejectedValueOnce(problem(500)).mockResolvedValue('w-9')
      const { wrapper } = await mountView(WalletFormView, 'wallets')
      await field(wrapper, 'name').setValue('Main')
      await chooseType(wrapper, 'PERSONAL')

      await submit(wrapper)
      expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)

      await submit(wrapper)
      expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(false)
    })

    it('shows that it is saving and locks the form while the request is under way', async () => {
      let finish: (id: string) => void = () => undefined
      vi.mocked(walletsApi.create).mockReturnValue(new Promise((resolve) => (finish = resolve)))
      const { wrapper } = await mountView(WalletFormView, 'wallets')
      await field(wrapper, 'name').setValue('Main')
      await chooseType(wrapper, 'PERSONAL')

      await wrapper.find('form').trigger('submit')
      await settle()

      const saving = buttonWithText(wrapper, 'Salvando…')
      expect(saving.attributes('aria-busy')).toBe('true')
      expect(saving.attributes('disabled')).toBeDefined()
      expect(wrapper.find('fieldset').attributes('disabled')).toBeDefined()

      finish('w-9')
      await settle()

      expect(wrapper.text()).not.toContain('Salvando…')
    })

    it('asks before leaving even when only a field other than the name changed', async () => {
      const { wrapper } = await mountView(WalletFormView, 'wallets')
      await field(wrapper, 'description').setValue('Notes')
      await settle()
      const dialog = useConfirmDialog()

      const leaving = buttonWithText(wrapper, 'Cancelar').trigger('click')
      await flushPromises()

      expect(dialog.state.options.description).toBe('Os dados informados vão se perder.')
      dialog.cancel()
      await leaving
    })

    it('goes back to the listing with Cancelar when nothing changed', async () => {
      const { wrapper, router } = await mountView(WalletFormView, 'wallets')

      await buttonWithText(wrapper, 'Cancelar').trigger('click')
      await settle()

      expect(router.currentRoute.value.name).toBe('wallets')
    })

    it('asks before leaving with changes and stays when told to keep editing', async () => {
      const { wrapper, router } = await mountView(WalletFormView, 'wallets')
      await field(wrapper, 'name').setValue('Main')
      await settle()
      expect(wrapper.text()).toContain('Alterações não salvas')
      const dialog = useConfirmDialog()

      const leaving = buttonWithText(wrapper, 'Cancelar').trigger('click')
      await flushPromises()

      expect(dialog.state.options.title).toBe('Sair sem salvar?')
      expect(dialog.state.options.description).toBe('As alterações em “Main” vão se perder.')

      dialog.cancel()
      await leaving
      await settle()

      expect(router.currentRoute.value.name).not.toBe('wallets')
    })

    it('leaves when told to leave without saving', async () => {
      const { wrapper, router } = await mountView(WalletFormView, 'wallets')
      await field(wrapper, 'name').setValue('Main')
      await settle()
      const dialog = useConfirmDialog()

      await buttonWithText(wrapper, 'Cancelar').trigger('click')
      await flushPromises()
      dialog.accept()
      await settle()

      expect(router.currentRoute.value.name).toBe('wallets')
    })

    it('lets a forced navigation to a public route through, such as the end of the session', async () => {
      const { wrapper, router } = await mountView(WalletFormView, 'wallets')
      await field(wrapper, 'name').setValue('Main')
      await settle()

      await router.push({ name: 'login' })

      expect(router.currentRoute.value.name).toBe('login')
      expect(useConfirmDialog().state.open).toBe(false)
    })

    it('stops guarding the leaving once the form is gone', async () => {
      const { wrapper, router } = await mountView(WalletFormView, 'wallets')
      await field(wrapper, 'name').setValue('Main')
      await settle()

      wrapper.unmount()
      await router.push({ name: 'wallets' })

      expect(router.currentRoute.value.name).toBe('wallets')
    })
  })

  describe('editing', () => {
    it('locks the form only while the wallet is being loaded', async () => {
      let finish: (view: WalletView) => void = () => undefined
      vi.mocked(walletsApi.findById).mockReturnValue(new Promise((resolve) => (finish = resolve)))
      const { wrapper } = await mountView(WalletFormView, 'wallets', { id: 'w-1' })

      expect(wrapper.find('fieldset').attributes('disabled')).toBeDefined()

      finish(existing)
      await settle()

      expect(wrapper.find('fieldset').attributes('disabled')).toBeUndefined()
    })

    it('loads the wallet into the form with the type locked and the name as the subtitle', async () => {
      vi.mocked(walletsApi.findById).mockResolvedValue(existing)

      const { wrapper } = await mountView(WalletFormView, 'wallets', { id: 'w-1' })

      expect(walletsApi.findById).toHaveBeenCalledWith('w-1')
      expect(wrapper.find('h1').text()).toBe('Editando carteira')
      expect(wrapper.find('[data-slot="page-description"]').text()).toBe('Main')
      expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('Main')
      expect((field(wrapper, 'bank').element as HTMLInputElement).value).toBe('ACME')
      expect((field(wrapper, 'description').element as HTMLTextAreaElement).value).toBe('Daily use')
      expect(wrapper.find('button[role="combobox"]').attributes('disabled')).toBeDefined()
      expect(wrapper.find('button[role="switch"]').attributes('aria-checked')).toBe('true')
      expect(wrapper.text()).toContain('O tipo não muda depois de criada.')
      expect(buttonWithText(wrapper, 'Salvar alterações')).toBeDefined()
    })

    it('does not count the loaded values as changes', async () => {
      vi.mocked(walletsApi.findById).mockResolvedValue(existing)
      const { wrapper, router } = await mountView(WalletFormView, 'wallets', { id: 'w-1' })

      expect(wrapper.text()).not.toContain('Alterações não salvas')

      await buttonWithText(wrapper, 'Cancelar').trigger('click')
      await settle()

      expect(router.currentRoute.value.name).toBe('wallets')
    })

    it('saves the changes, including the status, and goes to the detail', async () => {
      vi.mocked(walletsApi.findById).mockResolvedValue(existing)
      vi.mocked(walletsApi.update).mockResolvedValue(existing)
      const { wrapper, router } = await mountView(WalletFormView, 'wallets', { id: 'w-1' })

      await field(wrapper, 'name').setValue('Renamed')
      await wrapper.find('button[role="switch"]').trigger('click')
      await submit(wrapper)

      expect(walletsApi.update).toHaveBeenCalledWith('w-1', {
        name: 'Renamed',
        active: false,
        bank: 'ACME',
        agency: '123',
        number: '456',
        description: 'Daily use',
      })
      expect(toast.success).toHaveBeenCalledWith('Alterações salvas', {
        description: '“Renamed” foi atualizada.',
        duration: 4000,
      })
      expect(router.currentRoute.value.name).toBe('wallets.detail')
      expect(router.currentRoute.value.params.id).toBe('w-1')
    })

    it('shows the server error when the wallet cannot be loaded', async () => {
      vi.mocked(walletsApi.findById).mockRejectedValue(problem(404))

      const { wrapper } = await mountView(WalletFormView, 'wallets', { id: 'w-9' })

      expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
        'O recurso solicitado não existe',
      )
    })

    it('shows the server error when the update is rejected', async () => {
      vi.mocked(walletsApi.findById).mockResolvedValue(existing)
      vi.mocked(walletsApi.update).mockRejectedValue(problem(422))
      const { wrapper } = await mountView(WalletFormView, 'wallets', { id: 'w-1' })

      await submit(wrapper)

      expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
        'Revise os dados e tente novamente',
      )
    })
  })
})
