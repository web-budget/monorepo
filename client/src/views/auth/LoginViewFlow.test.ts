import { flushPromises, mount } from '@vue/test-utils'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { authApi } from '@/api/auth'
import { ApiError } from '@/api/client'
import { installZodErrorMap } from '@/schemas/zodErrorMap'
import { useAuthStore } from '@/stores/auth'
import { useLanguageStore } from '@/stores/language'
import { createTestPlugins } from '@/test/mounting'
import { settle } from '@/test/settle'
import type { LoginOutcome, SessionResponse } from '@/types'
import { isHandled } from '@/utils/handledErrors'
import LoginView from '@/views/auth/LoginView.vue'

vi.mock('@/api/auth', () => ({
  authApi: { fetchConfig: vi.fn<() => Promise<unknown>>() },
}))

const session: SessionResponse = {
  name: 'Ana',
  email: 'ana@example.com',
  status: 'APPROVED',
  language: 'PT_BR',
  hasPassword: true,
  googleLinked: false,
  totpEnabled: false,
  roles: [],
}

const enrollment = { secretKey: 'JBSWY3DPEHPK3PXP', qrCodeDataUri: 'data:image/png;base64,AAAA' }

const authenticated: LoginOutcome = { kind: 'authenticated', session }

async function render(query = '') {
  vi.mocked(authApi.fetchConfig).mockResolvedValue({ googleAuthEnabled: true })
  const { router, plugins } = createTestPlugins({
    routes: [
      { path: '/start', name: 'start', component: { render: () => h('div') } },
      { path: '/private-page', component: { render: () => h('div') } },
      {
        path: '/pending-approval',
        name: 'pending-approval',
        component: { render: () => h('div') },
      },
      {
        path: '/auth/forgot-password',
        name: 'forgot-password',
        component: { render: () => h('div') },
      },
    ],
  })
  const auth = useAuthStore()
  vi.mocked(auth.restoreSession).mockResolvedValue(false)
  vi.mocked(auth.login).mockResolvedValue(authenticated)
  vi.mocked(auth.linkGoogle).mockResolvedValue(authenticated)
  vi.mocked(auth.register).mockResolvedValue()
  vi.mocked(auth.enrollTotp).mockResolvedValue(enrollment)
  vi.mocked(auth.verifyTotp).mockResolvedValue(session)
  await router.push(`/${query}`)
  await router.isReady()
  const wrapper = mount(LoginView, { attachTo: document.body, global: { plugins } })
  await settle()
  return { wrapper, router, auth }
}

type Wrapper = Awaited<ReturnType<typeof render>>['wrapper']

async function signIn(wrapper: Wrapper, email = 'ana@example.com', password = 'secret') {
  await wrapper.find('input[type="email"]').setValue(email)
  await wrapper.find('input[autocomplete="current-password"]').setValue(password)
  await wrapper.find('form').trigger('submit')
  await settle()
}

async function typeCode(wrapper: Wrapper, code: string) {
  const boxes = wrapper.findAll('input[autocomplete="one-time-code"]')
  for (const [index, digit] of [...code].entries()) {
    await boxes[index]!.setValue(digit)
    await settle()
  }
}

function titleOf(wrapper: Wrapper) {
  return wrapper.find('h1').text()
}

describe('LoginView, the steps of the flow', () => {
  beforeAll(() => {
    installZodErrorMap()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  describe('the TOTP of an account that has one', () => {
    it('asks for the code after the credentials and signs in with it', async () => {
      const { wrapper, router, auth } = await render()
      vi.mocked(auth.login).mockResolvedValueOnce({ kind: 'needs_totp' })

      await signIn(wrapper)
      expect(titleOf(wrapper)).toBe('Código de verificação')

      await typeCode(wrapper, '482015')

      expect(auth.login).toHaveBeenLastCalledWith({
        email: 'ana@example.com',
        password: 'secret',
        totpCode: '482015',
        trustDevice: false,
      })
      expect(router.currentRoute.value.name).toBe('start')
    })

    it('trusts the device when the person ticks the box', async () => {
      const { wrapper, auth } = await render()
      vi.mocked(auth.login).mockResolvedValueOnce({ kind: 'needs_totp' })

      await signIn(wrapper)
      await wrapper.find('button[role="checkbox"]').trigger('click')
      await typeCode(wrapper, '482015')

      expect(auth.login).toHaveBeenLastCalledWith(expect.objectContaining({ trustDevice: true }))
    })

    it('says the code is wrong and stays on the step', async () => {
      const { wrapper, auth, router } = await render()
      vi.mocked(auth.login).mockResolvedValueOnce({ kind: 'needs_totp' })
      await signIn(wrapper)
      vi.mocked(auth.login).mockRejectedValueOnce(new ApiError({ error: 'invalid_totp_code' }, 401))

      await typeCode(wrapper, '000000')

      expect(wrapper.text()).toContain('Código inválido')
      expect(titleOf(wrapper)).toBe('Código de verificação')
      expect(router.currentRoute.value.name).not.toBe('start')
    })

    it('says the code is wrong when the server asks for it again', async () => {
      const { wrapper, auth } = await render()
      vi.mocked(auth.login).mockResolvedValue({ kind: 'needs_totp' })
      await signIn(wrapper)

      await typeCode(wrapper, '000000')

      expect(wrapper.text()).toContain('Código inválido')
    })

    it('warns about too many attempts', async () => {
      const { wrapper, auth } = await render()
      vi.mocked(auth.login).mockResolvedValueOnce({ kind: 'needs_totp' })
      await signIn(wrapper)
      vi.mocked(auth.login).mockRejectedValueOnce(
        new ApiError({ error: 'too_many_totp_attempts' }, 429),
      )

      await typeCode(wrapper, '000000')

      expect(wrapper.find('[data-slot="step-failure"]').text()).toContain(
        'Muitas tentativas seguidas',
      )
    })

    it('goes back to the credentials when the password stopped working', async () => {
      const { wrapper, auth } = await render()
      vi.mocked(auth.login).mockResolvedValueOnce({ kind: 'needs_totp' })
      await signIn(wrapper)
      vi.mocked(auth.login).mockRejectedValueOnce(new ApiError({ error: 'account-disabled' }, 401))

      await typeCode(wrapper, '482015')

      expect(titleOf(wrapper)).toBe('Entrar')
      expect(wrapper.find('[data-slot="login-failure"]').text()).toContain(
        'E-mail ou senha incorretos',
      )
    })

    it('stays on the step when the request did not reach the server', async () => {
      const { wrapper, auth } = await render()
      vi.mocked(auth.login).mockResolvedValueOnce({ kind: 'needs_totp' })
      await signIn(wrapper)
      vi.mocked(auth.login).mockRejectedValueOnce(new ApiError(null, null))

      await typeCode(wrapper, '482015')

      expect(titleOf(wrapper)).toBe('Código de verificação')
      expect(wrapper.text()).not.toContain('Código inválido')
    })

    it('lets the person use another account, forgetting the first credentials', async () => {
      const { wrapper, auth } = await render()
      vi.mocked(auth.login).mockResolvedValueOnce({ kind: 'needs_totp' })
      await signIn(wrapper)

      await wrapper.findAll('button[type="button"]').slice(-1)[0]!.trigger('click')
      expect(titleOf(wrapper)).toBe('Entrar')

      vi.mocked(auth.login).mockResolvedValueOnce({ kind: 'needs_totp' })
      await signIn(wrapper, 'bia@example.com', 'other')
      await typeCode(wrapper, '482015')

      expect(auth.login).toHaveBeenLastCalledWith(
        expect.objectContaining({ email: 'bia@example.com', password: 'other' }),
      )
    })
  })

  describe('the first TOTP of an account', () => {
    it('shows the QR code, and activates the account with the first code', async () => {
      const { wrapper, router, auth } = await render()
      vi.mocked(auth.login).mockResolvedValueOnce({ kind: 'needs_enrollment' })

      await signIn(wrapper)

      expect(auth.enrollTotp).toHaveBeenCalledWith({ email: 'ana@example.com', password: 'secret' })
      expect(titleOf(wrapper)).toBe('Proteja sua conta')
      expect(wrapper.find('img').attributes('src')).toBe(enrollment.qrCodeDataUri)

      await typeCode(wrapper, '482015')

      expect(auth.verifyTotp).toHaveBeenCalledWith({
        email: 'ana@example.com',
        password: 'secret',
        code: '482015',
      })
      expect(router.currentRoute.value.name).toBe('start')
    })

    it('says the code is wrong and keeps the QR code', async () => {
      const { wrapper, auth } = await render()
      vi.mocked(auth.login).mockResolvedValueOnce({ kind: 'needs_enrollment' })
      await signIn(wrapper)
      vi.mocked(auth.verifyTotp).mockRejectedValueOnce(
        new ApiError({ error: 'invalid_totp_code' }, 401),
      )

      await typeCode(wrapper, '000000')

      expect(wrapper.text()).toContain('Código inválido')
      expect(wrapper.find('img').exists()).toBe(true)
    })

    it('moves on to the code step when somebody enrolled the account meanwhile', async () => {
      const { wrapper, auth } = await render()
      vi.mocked(auth.login).mockResolvedValueOnce({ kind: 'needs_enrollment' })
      await signIn(wrapper)
      const conflict = new ApiError({ error: 'totp_already_enabled' }, 409)
      vi.mocked(auth.verifyTotp).mockRejectedValueOnce(conflict)

      await typeCode(wrapper, '482015')

      expect(titleOf(wrapper)).toBe('Código de verificação')
      expect(isHandled(conflict)).toBe(true)
    })

    it.each([
      [
        'a rate limit',
        new ApiError({ error: 'too_many_login_attempts' }, 429),
        'Muitas tentativas seguidas',
      ],
      [
        'bad credentials',
        new ApiError({ error: 'invalid-credentials' }, 401),
        'E-mail ou senha incorretos',
      ],
    ])(
      'goes back to the credentials with the reason when the QR code is refused by %s',
      async (_, error, message) => {
        const { wrapper, auth } = await render()
        vi.mocked(auth.login).mockResolvedValueOnce({ kind: 'needs_enrollment' })
        vi.mocked(auth.enrollTotp).mockRejectedValueOnce(error)

        await signIn(wrapper)

        expect(titleOf(wrapper)).toBe('Entrar')
        expect(wrapper.find('[data-slot="login-failure"]').text()).toContain(message)
      },
    )

    it('goes back to the credentials, quietly, when the QR code fails for another reason', async () => {
      const { wrapper, auth } = await render()
      vi.mocked(auth.login).mockResolvedValueOnce({ kind: 'needs_enrollment' })
      vi.mocked(auth.enrollTotp).mockRejectedValueOnce(new Error('boom'))

      await signIn(wrapper)

      expect(titleOf(wrapper)).toBe('Entrar')
      expect(wrapper.find('[data-slot="login-failure"]').exists()).toBe(false)
    })

    it('lets the person use another account', async () => {
      const { wrapper, auth } = await render()
      vi.mocked(auth.login).mockResolvedValueOnce({ kind: 'needs_enrollment' })
      await signIn(wrapper)

      await wrapper.findAll('button[type="button"]').slice(-1)[0]!.trigger('click')

      expect(titleOf(wrapper)).toBe('Entrar')
    })
  })

  describe('where a successful login goes', () => {
    it('sends an account that is not approved to the approval screen', async () => {
      const { wrapper, router, auth } = await render()
      vi.mocked(auth.login).mockResolvedValueOnce({
        kind: 'authenticated',
        session: { ...session, status: 'PENDING' },
      })

      await signIn(wrapper)

      expect(router.currentRoute.value.name).toBe('pending-approval')
    })

    it('sends an account that was not approved when it enrolled to the approval screen too', async () => {
      const { wrapper, router, auth } = await render()
      vi.mocked(auth.login).mockResolvedValueOnce({ kind: 'needs_enrollment' })
      vi.mocked(auth.verifyTotp).mockResolvedValueOnce({ ...session, status: 'PENDING' })
      await signIn(wrapper)

      await typeCode(wrapper, '482015')

      expect(router.currentRoute.value.name).toBe('pending-approval')
    })

    it('goes back to the page that asked for the login, after the TOTP too', async () => {
      const { wrapper, router, auth } = await render('?redirect=/private-page')
      vi.mocked(auth.login).mockResolvedValueOnce({ kind: 'needs_totp' })
      await signIn(wrapper)

      await typeCode(wrapper, '482015')

      expect(router.currentRoute.value.path).toBe('/private-page')
    })
  })

  describe('creating an account', () => {
    async function openRegister(wrapper: Wrapper) {
      await wrapper.findAll('button[type="button"]').slice(-1)[0]!.trigger('click')
      await settle()
    }

    async function fillRegister(wrapper: Wrapper) {
      await wrapper.find('input[autocomplete="name"]').setValue('Maria')
      await wrapper.find('input[type="email"]').setValue('maria@example.com')
      await wrapper.find('input[autocomplete="new-password"]').setValue('Caderno1')
      await wrapper.find('form').trigger('submit')
      await settle()
    }

    it('registers and goes to the approval screen', async () => {
      const { wrapper, router, auth } = await render()

      await openRegister(wrapper)
      expect(titleOf(wrapper)).toBe('Criar conta')
      await fillRegister(wrapper)

      expect(auth.register).toHaveBeenCalledWith({
        name: 'Maria',
        email: 'maria@example.com',
        password: 'Caderno1',
        defaultLanguage: 'PT_BR',
      })
      expect(router.currentRoute.value.name).toBe('pending-approval')
    })

    it('registers the account in the language that is on screen', async () => {
      const { wrapper, auth } = await render()
      useLanguageStore().locale = 'en-US'

      await openRegister(wrapper)
      await fillRegister(wrapper)

      expect(auth.register).toHaveBeenCalledWith(
        expect.objectContaining({ defaultLanguage: 'EN_US' }),
      )
    })

    it('warns about too many registrations and stays on the step', async () => {
      const { wrapper, router, auth } = await render()
      vi.mocked(auth.register).mockRejectedValueOnce(
        new ApiError({ error: 'too_many_registration_attempts' }, 429),
      )

      await openRegister(wrapper)
      await fillRegister(wrapper)

      expect(wrapper.find('[data-slot="step-failure"]').text()).toContain(
        'Muitos cadastros seguidos',
      )
      expect(router.currentRoute.value.name).not.toBe('pending-approval')
    })

    it('stays quiet and on the step when the registration fails for another reason', async () => {
      const { wrapper, auth } = await render()
      vi.mocked(auth.register).mockRejectedValueOnce(new ApiError({ error: 'bad-request' }, 400))

      await openRegister(wrapper)
      await fillRegister(wrapper)

      expect(titleOf(wrapper)).toBe('Criar conta')
      expect(wrapper.find('[data-slot="step-failure"]').exists()).toBe(false)
    })

    it('clears the rate limit when the step is opened again', async () => {
      const { wrapper, auth } = await render()
      vi.mocked(auth.register).mockRejectedValueOnce(
        new ApiError({ error: 'too_many_registration_attempts' }, 429),
      )
      await openRegister(wrapper)
      await fillRegister(wrapper)

      await wrapper.findAll('button[type="button"]').slice(-1)[0]!.trigger('click')
      expect(titleOf(wrapper)).toBe('Entrar')
      await openRegister(wrapper)

      expect(wrapper.find('[data-slot="step-failure"]').exists()).toBe(false)
    })
  })

  describe('coming back from the Google sign-in', () => {
    it('opens the link step with the token, and takes it out of the address', async () => {
      const { wrapper, router } = await render(
        '?error=email_in_use&linkToken=abc&redirect=/private-page',
      )

      expect(titleOf(wrapper)).toBe('Vincular sua conta Google')
      expect(router.currentRoute.value.query).toEqual({ redirect: '/private-page' })
    })

    it('links the account with the password and signs in', async () => {
      const { wrapper, router, auth } = await render('?error=email_in_use&linkToken=abc')

      await wrapper.find('input[autocomplete="current-password"]').setValue('secret')
      await wrapper.find('form').trigger('submit')
      await settle()

      expect(auth.linkGoogle).toHaveBeenCalledWith({ linkToken: 'abc', password: 'secret' })
      expect(router.currentRoute.value.name).toBe('start')
    })

    it('asks for the TOTP and sends the password again with it', async () => {
      const { wrapper, router, auth } = await render('?error=email_in_use&linkToken=abc')
      vi.mocked(auth.linkGoogle).mockResolvedValueOnce({ kind: 'needs_totp' })

      await wrapper.find('input[autocomplete="current-password"]').setValue('secret')
      await wrapper.find('form').trigger('submit')
      await settle()
      expect(wrapper.find('input[autocomplete="current-password"]').exists()).toBe(false)
      await typeCode(wrapper, '482015')

      expect(auth.linkGoogle).toHaveBeenLastCalledWith({
        linkToken: 'abc',
        password: 'secret',
        totpCode: '482015',
      })
      expect(router.currentRoute.value.name).toBe('start')
    })

    it.each([
      ['a wrong password', new ApiError({ error: 'invalid-credentials' }, 401)],
      ['a wrong code', new ApiError({ error: 'invalid_totp_code' }, 401)],
      ['an expired token', new ApiError({ error: 'invalid_google_link_token' }, 400)],
    ])(
      'sends the person back to the Google sign-in after %s, because the server burned the token',
      async (_, error) => {
        const { wrapper, auth } = await render('?error=email_in_use&linkToken=abc')
        vi.mocked(auth.linkGoogle).mockRejectedValueOnce(error)

        await wrapper.find('input[autocomplete="current-password"]').setValue('secret')
        await wrapper.find('form').trigger('submit')
        await settle()

        expect(titleOf(wrapper)).toBe('O vínculo não foi concluído')
        expect(isHandled(error)).toBe(true)
        expect(wrapper.find('form').exists()).toBe(false)
      },
    )

    it('keeps the token when the server only asks to wait', async () => {
      const { wrapper, auth } = await render('?error=email_in_use&linkToken=abc')
      vi.mocked(auth.linkGoogle).mockRejectedValueOnce(
        new ApiError({ error: 'too_many_login_attempts' }, 429),
      )

      await wrapper.find('input[autocomplete="current-password"]').setValue('secret')
      await wrapper.find('form').trigger('submit')
      await settle()

      expect(wrapper.find('[data-slot="step-failure"]').text()).toContain(
        'Muitas tentativas seguidas',
      )
      expect(titleOf(wrapper)).toBe('Vincular sua conta Google')
    })

    it('keeps the token when the request did not reach the server', async () => {
      const { wrapper, auth } = await render('?error=email_in_use&linkToken=abc')
      vi.mocked(auth.linkGoogle).mockRejectedValueOnce(new ApiError(null, null))

      await wrapper.find('input[autocomplete="current-password"]').setValue('secret')
      await wrapper.find('form').trigger('submit')
      await settle()

      expect(titleOf(wrapper)).toBe('Vincular sua conta Google')
    })

    it('cancels back to the credentials', async () => {
      const { wrapper } = await render('?error=email_in_use&linkToken=abc')

      await wrapper.findAll('button[type="button"]').slice(-1)[0]!.trigger('click')

      expect(titleOf(wrapper)).toBe('Entrar')
    })

    it('explains a collision it cannot offer to link', async () => {
      const { wrapper } = await render('?error=email_in_use')

      expect(titleOf(wrapper)).toBe('Entrar')
      expect(wrapper.find('[data-slot="login-failure"]').text()).toContain(
        'Este e-mail já tem uma conta',
      )
    })

    it.each(['oauth_failed', 'anything-else'])(
      'says the Google sign-in failed for ?error=%s',
      async (error) => {
        const { wrapper, router } = await render(`?error=${error}`)

        expect(wrapper.find('[data-slot="login-failure"]').text()).toContain(
          'Não foi possível entrar com o Google',
        )
        expect(router.currentRoute.value.query).toEqual({})
      },
    )

    it('leaves the address alone when there is nothing to clean', async () => {
      const { router } = await render('?reason=expired')
      const replace = vi.spyOn(router, 'replace')

      await flushPromises()

      expect(replace).not.toHaveBeenCalled()
      expect(router.currentRoute.value.query).toEqual({ reason: 'expired' })
    })
  })

  it('does not send the credentials twice while the first request is open', async () => {
    const { wrapper, auth } = await render()
    vi.mocked(auth.login).mockReturnValue(new Promise(() => undefined))

    await wrapper.find('input[type="email"]').setValue('ana@example.com')
    await wrapper.find('input[autocomplete="current-password"]').setValue('secret')
    const form = wrapper.find('form')
    await form.trigger('submit')
    await settle()
    await form.trigger('submit')
    await settle()

    expect(auth.login).toHaveBeenCalledTimes(1)
  })
})
