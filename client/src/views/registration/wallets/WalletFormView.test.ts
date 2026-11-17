import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { walletsApi } from '@/api/wallets'
import { Select } from '@/components/ui/select'
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

function field(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper'], name: string) {
  return wrapper.find(`[name="${name}"]`)
}

async function chooseType(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper'], type: string) {
  wrapper.getComponent(Select).vm.$emit('update:modelValue', type)
  await settle()
}

async function submit(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper']) {
  await wrapper.find('form').trigger('submit')
  await settle()
}

describe('WalletFormView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  describe('creating', () => {
    it('shows the creation title and no status toggle', async () => {
      const { wrapper } = await mountView(WalletFormView, 'wallets')

      expect(wrapper.text()).toContain('Nova carteira')
      expect(wrapper.find('[aria-pressed]').exists()).toBe(false)
      expect(walletsApi.findById).not.toHaveBeenCalled()
    })

    it('asks for the required fields', async () => {
      const { wrapper } = await mountView(WalletFormView, 'wallets')

      await submit(wrapper)

      expect(wrapper.text()).toContain('Campo obrigatório')
      expect(walletsApi.create).not.toHaveBeenCalled()
    })

    it('disables the bank fields unless the wallet is a bank account', async () => {
      const { wrapper } = await mountView(WalletFormView, 'wallets')

      expect(field(wrapper, 'bank').attributes('disabled')).toBeDefined()
      expect(field(wrapper, 'agency').attributes('disabled')).toBeDefined()
      expect(field(wrapper, 'number').attributes('disabled')).toBeDefined()

      await chooseType(wrapper, 'BANK_ACCOUNT')

      expect(field(wrapper, 'bank').attributes('disabled')).toBeUndefined()
      expect(field(wrapper, 'agency').attributes('disabled')).toBeUndefined()
      expect(field(wrapper, 'number').attributes('disabled')).toBeUndefined()

      await chooseType(wrapper, 'PERSONAL')

      expect(field(wrapper, 'bank').attributes('disabled')).toBeDefined()
    })

    it('creates a bank account and clears the form', async () => {
      vi.mocked(walletsApi.create).mockResolvedValue(undefined)
      const { wrapper } = await mountView(WalletFormView, 'wallets')

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
      expect(toast.success).toHaveBeenCalledWith('Registro criado', {
        description: 'Carteira criada com sucesso',
        duration: 4000,
      })
      expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('')
    })

    it('drops the bank data of a personal wallet', async () => {
      vi.mocked(walletsApi.create).mockResolvedValue(undefined)
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

    it('shows the server error inside the form and keeps the values', async () => {
      vi.mocked(walletsApi.create).mockRejectedValue(
        problem(409, { error: 'conflict', parameters: { 'wallet.name': 'Main' } }),
      )
      const { wrapper } = await mountView(WalletFormView, 'wallets')

      await field(wrapper, 'name').setValue('Main')
      await chooseType(wrapper, 'PERSONAL')
      await submit(wrapper)

      expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
        'Nome "Main" já esta em uso',
      )
      expect(toast.success).not.toHaveBeenCalled()
      expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('Main')
    })

    it('clears the previous server error on the next attempt', async () => {
      vi.mocked(walletsApi.create).mockRejectedValueOnce(problem(500)).mockResolvedValue(undefined)
      const { wrapper } = await mountView(WalletFormView, 'wallets')
      await field(wrapper, 'name').setValue('Main')
      await chooseType(wrapper, 'PERSONAL')

      await submit(wrapper)
      expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)

      await submit(wrapper)
      expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(false)
    })

    it('goes back to the listing', async () => {
      const { wrapper, router } = await mountView(WalletFormView, 'wallets')

      await buttonWithText(wrapper, 'Voltar').trigger('click')
      await settle()

      expect(router.currentRoute.value.name).toBe('wallets')
    })
  })

  describe('editing', () => {
    it('loads the wallet into the form with the type locked', async () => {
      vi.mocked(walletsApi.findById).mockResolvedValue(existing)

      const { wrapper } = await mountView(WalletFormView, 'wallets', { id: 'w-1' })

      expect(walletsApi.findById).toHaveBeenCalledWith('w-1')
      expect(wrapper.text()).toContain('Editando carteira')
      expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('Main')
      expect((field(wrapper, 'bank').element as HTMLInputElement).value).toBe('ACME')
      expect((field(wrapper, 'description').element as HTMLTextAreaElement).value).toBe('Daily use')
      expect(wrapper.find('button[role="combobox"]').attributes('disabled')).toBeDefined()
      expect(buttonWithText(wrapper, 'Ativo').attributes('aria-pressed')).toBe('true')
    })

    it('saves the changes, including the status', async () => {
      vi.mocked(walletsApi.findById).mockResolvedValue(existing)
      vi.mocked(walletsApi.update).mockResolvedValue(existing)
      const { wrapper } = await mountView(WalletFormView, 'wallets', { id: 'w-1' })

      await field(wrapper, 'name').setValue('Renamed')
      await buttonWithText(wrapper, 'Inativo').trigger('click')
      await submit(wrapper)

      expect(walletsApi.update).toHaveBeenCalledWith('w-1', {
        name: 'Renamed',
        active: false,
        bank: 'ACME',
        agency: '123',
        number: '456',
        description: 'Daily use',
      })
      expect(toast.success).toHaveBeenCalledWith('Registro atualizado', {
        description: 'Carteira atualizada com sucesso',
        duration: 4000,
      })
      expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('Renamed')
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
