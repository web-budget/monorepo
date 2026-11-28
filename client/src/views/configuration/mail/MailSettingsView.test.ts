import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { mailSettingsApi } from '@/api/mailSettings'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { buttonWithText, mountView, problem, settle } from '@/test/crud'
import type { MailSettingsView } from '@/types'
import MailSettingsView_ from '@/views/configuration/mail/MailSettingsView.vue'

vi.mock('@/api/mailSettings')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

type Wrapper = Awaited<ReturnType<typeof mountView>>['wrapper']

const SAVED: MailSettingsView = {
  enabled: false,
  configured: true,
  host: 'smtp.example.com.br',
  port: 587,
  security: 'STARTTLS',
  username: 'avisos@example.com.br',
  passwordSet: true,
  passwordStorageAvailable: true,
  fromAddress: 'avisos@example.com.br',
  fromName: 'webBudget',
  replyToAddress: 'contato@example.com.br',
  lastUpdate: '2026-11-27T14:32:00',
}

const EMPTY: MailSettingsView = {
  enabled: false,
  configured: false,
  host: null,
  port: null,
  security: 'STARTTLS',
  username: null,
  passwordSet: false,
  passwordStorageAvailable: true,
  fromAddress: null,
  fromName: null,
  replyToAddress: null,
  lastUpdate: null,
}

const SESSION = { auth: { session: { name: 'Maria', email: 'maria@example.com.br' } } }

async function render(settings: MailSettingsView = SAVED) {
  vi.mocked(mailSettingsApi.find).mockResolvedValue(settings)
  return mountView(MailSettingsView_, 'mail-settings', {}, SESSION)
}

function field(wrapper: Wrapper, name: string) {
  return wrapper.find<HTMLInputElement>(`input[name="${name}"]`)
}

function recipient(wrapper: Wrapper) {
  return wrapper.find<HTMLInputElement>('#mail-test-recipient')
}

function sendButton(wrapper: Wrapper) {
  return wrapper.find<HTMLButtonElement>('[data-slot="send-test"]')
}

function enabledSwitch(wrapper: Wrapper) {
  return wrapper.find<HTMLButtonElement>('#mail-enabled')
}

async function submit(wrapper: Wrapper) {
  await wrapper.find('form').trigger('submit')
  await settle()
}

describe('MailSettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  describe('layout', () => {
    it('shows the title, the subtitle, the sending card and the four sections', async () => {
      const { wrapper } = await render()

      expect(wrapper.find('h1').text()).toBe('E-mail')
      expect(wrapper.find('[data-slot="page-description"]').text()).toBe(
        'Servidor SMTP que envia os e-mails do webBudget.',
      )
      expect(wrapper.find('[data-slot="sending-card"]').text()).toContain('Enviar e-mails')
      expect(wrapper.findAll('h2').map((title) => title.text())).toEqual([
        'Servidor',
        'Autenticação',
        'Remetente',
        'Enviar teste',
      ])
      expect(wrapper.find('[data-slot="encryption-key-alert"]').exists()).toBe(false)
      expect(mailSettingsApi.find).toHaveBeenCalledOnce()
    })

    it('fills the form with what is saved, never with the password', async () => {
      const { wrapper } = await render()

      expect(field(wrapper, 'host').element.value).toBe('smtp.example.com.br')
      expect(field(wrapper, 'host').attributes('placeholder')).toBe('smtp.exemplo.com.br')
      expect(field(wrapper, 'port').element.value).toBe('587')
      expect(field(wrapper, 'port').classes()).toContain('font-mono')
      expect(wrapper.text()).toContain('STARTTLS')
      expect(field(wrapper, 'username').element.value).toBe('avisos@example.com.br')
      expect(field(wrapper, 'password').element.value).toBe('')
      expect(field(wrapper, 'password').attributes('type')).toBe('password')
      expect(field(wrapper, 'password').attributes('autocomplete')).toBe('new-password')
      expect(field(wrapper, 'fromAddress').element.value).toBe('avisos@example.com.br')
      expect(field(wrapper, 'fromName').element.value).toBe('webBudget')
      expect(field(wrapper, 'fromName').attributes('placeholder')).toBe('webBudget')
      expect(field(wrapper, 'replyToAddress').element.value).toBe('contato@example.com.br')
    })

    it('puts the e-mail of the signed in user as the recipient of the test', async () => {
      const { wrapper } = await render()

      expect(recipient(wrapper).element.value).toBe('maria@example.com.br')
    })

    it('leaves the recipient empty when there is no session', async () => {
      vi.mocked(mailSettingsApi.find).mockResolvedValue(SAVED)

      const { wrapper } = await mountView(MailSettingsView_, 'mail-settings')

      expect(recipient(wrapper).element.value).toBe('')
    })

    it('shows when it was saved in the footer, and the unsaved changes instead once edited', async () => {
      const { wrapper } = await render()

      expect(wrapper.text()).toContain('Salvo em 27/11/2026 14:32')
      expect(wrapper.text()).not.toContain('Alterações não salvas')

      await field(wrapper, 'host').setValue('smtp.outro.com.br')
      await settle()

      expect(wrapper.text()).toContain('Alterações não salvas')
      expect(wrapper.text()).not.toContain('Salvo em')
    })

    it('shows empty fields, no footer note and the default security for a server never saved', async () => {
      const { wrapper } = await render(EMPTY)

      expect(field(wrapper, 'host').element.value).toBe('')
      expect(field(wrapper, 'port').element.value).toBe('')
      expect(field(wrapper, 'port').attributes('placeholder')).toBe('587')
      expect(wrapper.text()).toContain('STARTTLS')
      expect(wrapper.text()).not.toContain('Salvo em')
      expect(wrapper.text()).not.toContain('Alterações não salvas')
    })
  })

  describe('sending', () => {
    it.each([
      [false, 'Desligado'],
      [true, 'Ligado'],
    ])('shows the state of the sending (enabled: %s)', async (enabled, state) => {
      const { wrapper } = await render({ ...SAVED, enabled })

      expect(wrapper.find('[data-slot="sending-card"]').text()).toContain(state)
      expect(enabledSwitch(wrapper).attributes('aria-checked')).toBe(String(enabled))
      expect(enabledSwitch(wrapper).element.disabled).toBe(false)
    })

    it('disables the switch and says there is no server until one is saved', async () => {
      const { wrapper } = await render(EMPTY)

      expect(wrapper.find('[data-slot="sending-card"]').text()).toContain('Sem servidor salvo')
      expect(enabledSwitch(wrapper).element.disabled).toBe(true)
    })

    it('turns the sending on without asking and without a successful test', async () => {
      vi.mocked(mailSettingsApi.updateEnabled).mockResolvedValue({ ...SAVED, enabled: true })
      const { wrapper } = await render()

      await enabledSwitch(wrapper).trigger('click')
      await settle()

      expect(mailSettingsApi.updateEnabled).toHaveBeenCalledWith(true)
      expect(mailSettingsApi.sendTest).not.toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('Envio de e-mails ligado', {
        description: undefined,
        duration: 4000,
      })
      expect(wrapper.find('[data-slot="sending-card"]').text()).toContain('Ligado')
      expect(enabledSwitch(wrapper).attributes('aria-checked')).toBe('true')
    })

    it('turns the sending off', async () => {
      vi.mocked(mailSettingsApi.updateEnabled).mockResolvedValue({ ...SAVED, enabled: false })
      const { wrapper } = await render({ ...SAVED, enabled: true })

      await enabledSwitch(wrapper).trigger('click')
      await settle()

      expect(mailSettingsApi.updateEnabled).toHaveBeenCalledWith(false)
      expect(toast.success).toHaveBeenCalledWith('Envio de e-mails desligado', {
        description: undefined,
        duration: 4000,
      })
      expect(wrapper.find('[data-slot="sending-card"]').text()).toContain('Desligado')
    })

    it.each([
      [false, 'Ligando…'],
      [true, 'Desligando…'],
    ])('says it is working while it saves (enabled: %s)', async (enabled, working) => {
      let finish: (settings: MailSettingsView) => void = () => undefined
      vi.mocked(mailSettingsApi.updateEnabled).mockReturnValue(
        new Promise((resolve) => (finish = resolve)),
      )
      const { wrapper } = await render({ ...SAVED, enabled })

      await enabledSwitch(wrapper).trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-slot="sending-card"]').text()).toContain(working)
      expect(enabledSwitch(wrapper).element.disabled).toBe(true)

      finish({ ...SAVED, enabled: !enabled })
      await settle()

      expect(wrapper.find('[data-slot="sending-card"]').text()).not.toContain(working)
    })

    it('keeps the old state and shows the server error when it cannot save', async () => {
      vi.mocked(mailSettingsApi.updateEnabled).mockRejectedValue(problem(500))
      const { wrapper } = await render()

      await enabledSwitch(wrapper).trigger('click')
      await settle()

      expect(enabledSwitch(wrapper).attributes('aria-checked')).toBe('false')
      expect(wrapper.find('[data-slot="sending-card"]').text()).toContain('Desligado')
      expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
      expect(toast.success).not.toHaveBeenCalled()
    })

    it('does not touch the unsaved form when the sending is turned on', async () => {
      vi.mocked(mailSettingsApi.updateEnabled).mockResolvedValue({ ...SAVED, enabled: true })
      const { wrapper } = await render()
      await field(wrapper, 'host').setValue('smtp.outro.com.br')

      await enabledSwitch(wrapper).trigger('click')
      await settle()

      expect(field(wrapper, 'host').element.value).toBe('smtp.outro.com.br')
      expect(wrapper.text()).toContain('Alterações não salvas')
    })
  })

  describe('saving', () => {
    it('saves the trimmed values, thanks with the toast, clears the test result and stays clean', async () => {
      vi.mocked(mailSettingsApi.update).mockResolvedValue({
        ...SAVED,
        host: 'smtp.outro.com.br',
        lastUpdate: '2026-11-28T10:15:00',
      })
      vi.mocked(mailSettingsApi.sendTest).mockResolvedValue()
      const { wrapper } = await render()
      await sendButton(wrapper).trigger('click')
      await settle()
      expect(wrapper.find('[data-slot="test-sent"]').exists()).toBe(true)

      await field(wrapper, 'host').setValue(' smtp.outro.com.br ')
      await field(wrapper, 'password').setValue(' nova ')
      await submit(wrapper)

      expect(mailSettingsApi.update).toHaveBeenCalledWith({
        host: 'smtp.outro.com.br',
        port: 587,
        security: 'STARTTLS',
        username: 'avisos@example.com.br',
        password: ' nova ',
        fromAddress: 'avisos@example.com.br',
        fromName: 'webBudget',
        replyToAddress: 'contato@example.com.br',
      })
      expect(toast.success).toHaveBeenCalledWith('Servidor de e-mail salvo', {
        description: undefined,
        duration: 4000,
      })
      expect(field(wrapper, 'host').element.value).toBe('smtp.outro.com.br')
      expect(field(wrapper, 'password').element.value).toBe('')
      expect(wrapper.text()).toContain('Salvo em 28/11/2026 10:15')
      expect(wrapper.text()).not.toContain('Alterações não salvas')
      expect(wrapper.find('[data-slot="test-sent"]').exists()).toBe(false)
    })

    it('sends no password when the field is left blank, to keep the saved one', async () => {
      vi.mocked(mailSettingsApi.update).mockResolvedValue(SAVED)
      const { wrapper } = await render()
      await field(wrapper, 'fromName').setValue('Avisos')

      await submit(wrapper)

      expect(mailSettingsApi.update).toHaveBeenCalledWith(
        expect.objectContaining({ password: null, fromName: 'Avisos' }),
      )
    })

    it('refuses an empty form with the messages under the fields and focuses the first', async () => {
      const { wrapper } = await render(EMPTY)

      await submit(wrapper)

      const text = wrapper.text()
      expect(text).toContain('Informe o servidor.')
      expect(text).toContain('Informe a porta.')
      expect(text).toContain('Informe o e-mail do remetente.')
      expect(document.activeElement).toBe(field(wrapper, 'host').element)
      expect(mailSettingsApi.update).not.toHaveBeenCalled()
    })

    it('refuses a port out of range and badly written e-mails', async () => {
      const { wrapper } = await render(EMPTY)
      await field(wrapper, 'host').setValue('smtp.example.com.br')
      await field(wrapper, 'port').setValue('70000')
      await field(wrapper, 'fromAddress').setValue('avisos@')
      await field(wrapper, 'replyToAddress').setValue('contato')

      await submit(wrapper)

      expect(wrapper.text()).toContain('Valor inválido.')
      expect(wrapper.text().match(/Informe um e-mail válido\./g)).toHaveLength(2)
      expect(mailSettingsApi.update).not.toHaveBeenCalled()
    })

    it('shows the server error on top and keeps the form as typed when the save is rejected', async () => {
      vi.mocked(mailSettingsApi.update).mockRejectedValue(
        problem(422, { error: 'field-validation-failed' }),
      )
      const { wrapper } = await render()
      await field(wrapper, 'host').setValue('smtp.outro.com.br')

      await submit(wrapper)

      expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
      expect(toast.success).not.toHaveBeenCalled()
      expect(field(wrapper, 'host').element.value).toBe('smtp.outro.com.br')
      expect(wrapper.text()).toContain('Alterações não salvas')
    })

    it('puts the saved values back with Cancelar, without leaving the screen', async () => {
      const { wrapper, router } = await render()
      await field(wrapper, 'host').setValue('smtp.outro.com.br')
      await settle()

      await buttonWithText(wrapper, 'Cancelar').trigger('click')
      await settle()

      expect(field(wrapper, 'host').element.value).toBe('smtp.example.com.br')
      expect(wrapper.text()).not.toContain('Alterações não salvas')
      expect(router.currentRoute.value.name).not.toBe('mail-settings')
    })

    it('asks before leaving with unsaved changes and stays when told to keep editing', async () => {
      const { wrapper, router } = await render()
      await field(wrapper, 'host').setValue('smtp.outro.com.br')
      await settle()
      const dialog = useConfirmDialog()

      const leaving = router.push({ name: 'mail-settings' })
      await flushPromises()

      expect(dialog.state.options.title).toBe('Sair sem salvar?')
      expect(dialog.state.options.description).toBe('Os dados informados vão se perder.')

      dialog.cancel()
      await leaving
      await settle()

      expect(field(wrapper, 'host').element.value).toBe('smtp.outro.com.br')
    })

    it('leaves without asking when nothing changed', async () => {
      const { router } = await render()

      await router.push({ name: 'mail-settings' })

      expect(router.currentRoute.value.name).toBe('mail-settings')
      expect(useConfirmDialog().state.open).toBe(false)
    })
  })

  describe('password', () => {
    it('shows dots as the placeholder and tells that the saved password is kept when left blank', async () => {
      const { wrapper } = await render()

      expect(field(wrapper, 'password').attributes('placeholder')).toBe('••••••••')
      expect(field(wrapper, 'password').element.disabled).toBe(false)
      expect(wrapper.find('[data-slot="password-hint"]').text()).toBe(
        'Senha salva. Em branco, ela é mantida.',
      )
      expect(wrapper.find('[data-slot="password-hint"]').classes()).not.toContain(
        'text-destructive',
      )
    })

    it('drops the hint once a new password is typed', async () => {
      const { wrapper } = await render()

      await field(wrapper, 'password').setValue('nova')

      expect(wrapper.find('[data-slot="password-hint"]').exists()).toBe(false)
    })

    it('warns in red, without blocking the save, that the saved password goes with the user', async () => {
      vi.mocked(mailSettingsApi.update).mockResolvedValue({
        ...SAVED,
        username: null,
        passwordSet: false,
      })
      const { wrapper } = await render()

      await field(wrapper, 'username').setValue('')
      await settle()

      const hint = wrapper.find('[data-slot="password-hint"]')
      expect(hint.text()).toBe('A senha salva sai ao salvar sem usuário.')
      expect(hint.classes()).toContain('text-destructive')
      expect(field(wrapper, 'password').element.disabled).toBe(true)
      expect(field(wrapper, 'password').attributes('placeholder')).toBeUndefined()
      expect(field(wrapper, 'password').attributes('aria-invalid')).not.toBe('true')

      await submit(wrapper)

      expect(mailSettingsApi.update).toHaveBeenCalledWith(
        expect.objectContaining({ username: null, password: null }),
      )
    })

    it('shows no hint and disables the field for a server without authentication', async () => {
      const { wrapper } = await render({
        ...SAVED,
        username: null,
        passwordSet: false,
      })

      expect(field(wrapper, 'password').element.disabled).toBe(true)
      expect(wrapper.find('[data-slot="password-hint"]').exists()).toBe(false)
    })

    it('shows no hint nor dots when no password is saved yet', async () => {
      const { wrapper } = await render({ ...SAVED, passwordSet: false })

      expect(field(wrapper, 'password').element.disabled).toBe(false)
      expect(field(wrapper, 'password').attributes('placeholder')).toBeUndefined()
      expect(wrapper.find('[data-slot="password-hint"]').exists()).toBe(false)
    })
  })

  describe('without the encryption key', () => {
    async function renderLocked() {
      return render({ ...SAVED, passwordStorageAvailable: false })
    }

    it('shows the error alert below the title', async () => {
      const { wrapper } = await renderLocked()

      const alert = wrapper.find('[data-slot="encryption-key-alert"]')
      expect(alert.text()).toContain('Falta a chave de cifra do e-mail')
      expect(alert.text()).toContain(
        'Defina a MAIL_ENCRYPTION_KEY no server e reinicie-o para configurar o e-mail.',
      )
    })

    it('makes the whole screen read-only', async () => {
      const { wrapper } = await renderLocked()

      expect(enabledSwitch(wrapper).element.disabled).toBe(true)
      expect(wrapper.find('[data-slot="sending-card"]').text()).not.toContain('Desligado')
      for (const name of ['host', 'port', 'username', 'password', 'fromAddress', 'fromName']) {
        expect(field(wrapper, name).element.matches(':disabled')).toBe(true)
      }
      expect(recipient(wrapper).element.matches(':disabled')).toBe(true)
      expect(sendButton(wrapper).element.matches(':disabled')).toBe(true)
      expect(buttonWithText(wrapper, 'Cancelar').element.matches(':disabled')).toBe(true)
      expect(buttonWithText(wrapper, 'Salvar').element.matches(':disabled')).toBe(true)
      expect(field(wrapper, 'password').attributes('placeholder')).toBeUndefined()
    })
  })

  describe('test e-mail', () => {
    it('disables the recipient and the button until a server is saved', async () => {
      const { wrapper } = await render(EMPTY)

      expect(recipient(wrapper).element.disabled).toBe(true)
      expect(sendButton(wrapper).element.disabled).toBe(true)
    })

    it('disables the button while there are unsaved changes and enables it again when they go', async () => {
      const { wrapper } = await render()
      expect(sendButton(wrapper).element.disabled).toBe(false)

      await field(wrapper, 'host').setValue('smtp.outro.com.br')
      await settle()
      expect(sendButton(wrapper).element.disabled).toBe(true)

      await buttonWithText(wrapper, 'Cancelar').trigger('click')
      await settle()
      expect(sendButton(wrapper).element.disabled).toBe(false)
    })

    it('sends the test to the recipient and says so, without saving the form', async () => {
      vi.mocked(mailSettingsApi.sendTest).mockResolvedValue()
      const { wrapper } = await render()
      await recipient(wrapper).setValue(' ana@example.com ')

      await sendButton(wrapper).trigger('click')
      await settle()

      expect(mailSettingsApi.sendTest).toHaveBeenCalledWith('ana@example.com')
      expect(mailSettingsApi.update).not.toHaveBeenCalled()
      const sent = wrapper.find('[data-slot="test-sent"]')
      expect(sent.text()).toContain('E-mail de teste enviado')
      expect(sent.text()).toContain('Para ana@example.com.')
    })

    it('sends the test with Enter in the recipient instead of saving the form', async () => {
      vi.mocked(mailSettingsApi.sendTest).mockResolvedValue()
      const { wrapper } = await render()

      await recipient(wrapper).trigger('keydown', { key: 'Enter' })
      await settle()

      expect(mailSettingsApi.sendTest).toHaveBeenCalledWith('maria@example.com.br')
      expect(mailSettingsApi.update).not.toHaveBeenCalled()
    })

    it('ignores Enter while the button is disabled', async () => {
      const { wrapper } = await render()
      await field(wrapper, 'host').setValue('smtp.outro.com.br')
      await settle()

      await recipient(wrapper).trigger('keydown', { key: 'Enter' })
      await settle()

      expect(mailSettingsApi.sendTest).not.toHaveBeenCalled()
    })

    it('says it is sending, and disables the button, until the server answers', async () => {
      let finish: () => void = () => undefined
      vi.mocked(mailSettingsApi.sendTest).mockReturnValue(
        new Promise((resolve) => (finish = () => resolve())),
      )
      const { wrapper } = await render()

      await sendButton(wrapper).trigger('click')
      await flushPromises()

      expect(sendButton(wrapper).text()).toBe('Enviando…')
      expect(sendButton(wrapper).element.disabled).toBe(true)

      finish()
      await settle()

      expect(sendButton(wrapper).text()).toBe('Enviar teste')
      expect(sendButton(wrapper).element.disabled).toBe(false)
    })

    it('shows the reason the SMTP server gave when the delivery fails, without a toast', async () => {
      vi.mocked(mailSettingsApi.sendTest).mockRejectedValue(
        problem(400, {
          error: 'mail-delivery-failed',
          parameters: { reason: '535-5.7.8 Username and Password not accepted' },
        }),
      )
      const { wrapper } = await render()

      await sendButton(wrapper).trigger('click')
      await settle()

      const failed = wrapper.find('[data-slot="test-failed"]')
      expect(failed.text()).toContain('Não foi possível enviar')
      expect(failed.text()).toContain('535-5.7.8 Username and Password not accepted')
      expect(failed.find('[data-slot="alert-description"]').classes()).toContain('font-mono')
      expect(wrapper.find('[data-slot="test-sent"]').exists()).toBe(false)
      expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(false)
    })

    it('explains the other refusals of the server in the same alert', async () => {
      vi.mocked(mailSettingsApi.sendTest).mockRejectedValue(
        problem(400, { error: 'mail-not-configured' }),
      )
      const { wrapper } = await render()

      await sendButton(wrapper).trigger('click')
      await settle()

      expect(wrapper.find('[data-slot="test-failed"]').text()).toContain(
        'Salve o servidor de e-mail antes de enviar o teste.',
      )
    })

    it('shows the alert with no reason when the session ended, which navigation handles', async () => {
      vi.mocked(mailSettingsApi.sendTest).mockRejectedValue(problem(401))
      const { wrapper } = await render()

      await sendButton(wrapper).trigger('click')
      await settle()

      const failed = wrapper.find('[data-slot="test-failed"]')
      expect(failed.text()).toBe('Não foi possível enviar')
    })

    it('clears the previous result when another test is sent', async () => {
      vi.mocked(mailSettingsApi.sendTest).mockRejectedValueOnce(problem(500))
      vi.mocked(mailSettingsApi.sendTest).mockResolvedValueOnce()
      const { wrapper } = await render()

      await sendButton(wrapper).trigger('click')
      await settle()
      expect(wrapper.find('[data-slot="test-failed"]').exists()).toBe(true)

      await sendButton(wrapper).trigger('click')
      await settle()

      expect(wrapper.find('[data-slot="test-failed"]').exists()).toBe(false)
      expect(wrapper.find('[data-slot="test-sent"]').exists()).toBe(true)
    })

    it.each([
      ['', 'Informe o destinatário.'],
      ['ana', 'Informe um e-mail válido.'],
    ])('refuses the recipient %j under the field and sends nothing', async (typed, message) => {
      const { wrapper } = await render()
      await recipient(wrapper).setValue(typed)

      await sendButton(wrapper).trigger('click')
      await settle()

      expect(wrapper.text()).toContain(message)
      expect(recipient(wrapper).attributes('aria-invalid')).toBe('true')
      expect(mailSettingsApi.sendTest).not.toHaveBeenCalled()

      await recipient(wrapper).setValue('ana@example.com')

      expect(wrapper.text()).not.toContain(message)
      expect(recipient(wrapper).attributes('aria-invalid')).toBe('false')
    })

    it('does not make the recipient part of the form changes', async () => {
      const { wrapper } = await render()

      await recipient(wrapper).setValue('ana@example.com')
      await settle()

      expect(wrapper.text()).not.toContain('Alterações não salvas')
      expect(sendButton(wrapper).element.disabled).toBe(false)
    })
  })

  describe('loading', () => {
    it('shows the error state with a retry when the settings cannot be loaded', async () => {
      vi.mocked(mailSettingsApi.find).mockRejectedValueOnce(problem(500))
      vi.mocked(mailSettingsApi.find).mockResolvedValue(SAVED)

      const { wrapper } = await mountView(MailSettingsView_, 'mail-settings', {}, SESSION)

      expect(wrapper.find('h1').text()).toBe('E-mail')
      expect(wrapper.text()).toContain('Não foi possível carregar a configuração de e-mail')
      expect(wrapper.find('form').exists()).toBe(false)

      await buttonWithText(wrapper, 'Tentar de novo').trigger('click')
      await settle()

      expect(wrapper.find('form').exists()).toBe(true)
      expect(field(wrapper, 'host').element.value).toBe('smtp.example.com.br')
      expect(mailSettingsApi.find).toHaveBeenCalledTimes(2)
    })
  })
})
