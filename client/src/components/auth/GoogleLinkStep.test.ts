import { mount } from '@vue/test-utils'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import GoogleLinkStep from '@/components/auth/GoogleLinkStep.vue'
import { installZodErrorMap } from '@/schemas/zodErrorMap'
import { createTestPlugins } from '@/test/mounting'
import { settle } from '@/test/settle'

function render(props: Record<string, unknown> = {}) {
  const { plugins } = createTestPlugins()
  return mount(GoogleLinkStep, {
    attachTo: document.body,
    props: { mode: 'password', loading: false, rateLimited: false, ...props },
    global: { plugins },
  })
}

describe('GoogleLinkStep', () => {
  beforeAll(() => {
    installZodErrorMap()
  })

  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('asks for the password of the local account', () => {
    const wrapper = render()

    expect(wrapper.find('h1').text()).toBe('Vincular sua conta Google')
    expect(wrapper.find('input[autocomplete="current-password"]').exists()).toBe(true)
  })

  it('emits the password once it is filled in', async () => {
    const wrapper = render()

    await wrapper.find('input[autocomplete="current-password"]').setValue('secret')
    await wrapper.find('form').trigger('submit')
    await settle()

    expect(wrapper.emitted('submitPassword')).toEqual([['secret']])
  })

  it('does not emit an empty password', async () => {
    const wrapper = render()

    await wrapper.find('form').trigger('submit')
    await settle()

    expect(wrapper.emitted('submitPassword')).toBeUndefined()
    expect(wrapper.text()).toContain('Campo obrigatório')
  })

  it('disables the form and says so while it sends', () => {
    const wrapper = render({ loading: true })

    expect(wrapper.find('fieldset').attributes('disabled')).toBeDefined()
    expect(wrapper.find('button[type="submit"]').text()).toBe('Vinculando…')
  })

  it('warns about too many attempts', () => {
    expect(render({ rateLimited: true }).find('[data-slot="step-failure"]').text()).toContain(
      'Muitas tentativas seguidas',
    )
    expect(render().find('[data-slot="step-failure"]').exists()).toBe(false)
  })

  it('cancels from the password form', async () => {
    const wrapper = render()

    await wrapper.findAll('button[type="button"]').slice(-1)[0]!.trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  describe('when the account has a TOTP', () => {
    async function typeCode(wrapper: ReturnType<typeof render>, code: string) {
      const boxes = wrapper.findAll('input[autocomplete="one-time-code"]')
      for (const [index, digit] of [...code].entries()) {
        await boxes[index]!.setValue(digit)
        await settle()
      }
    }

    it('asks for the code instead of the password', () => {
      const wrapper = render({ mode: 'totp' })

      expect(wrapper.text()).toContain('código de 6 dígitos')
      expect(wrapper.find('input[autocomplete="current-password"]').exists()).toBe(false)
      expect(wrapper.findAll('input[autocomplete="one-time-code"]')).toHaveLength(6)
    })

    it('sends the code on its own at the sixth digit', async () => {
      const wrapper = render({ mode: 'totp' })

      await typeCode(wrapper, '482015')

      expect(wrapper.emitted('submitCode')).toEqual([['482015']])
    })

    it('does not send an incomplete code nor a second one while it is sending', async () => {
      const wrapper = render({ mode: 'totp' })
      await typeCode(wrapper, '4820')
      await wrapper.find('form').trigger('submit')
      expect(wrapper.emitted('submitCode')).toBeUndefined()

      const sending = render({ mode: 'totp', loading: true })
      await typeCode(sending, '482015')
      expect(sending.emitted('submitCode')).toBeUndefined()
      expect(sending.find('button[type="submit"]').text()).toBe('Vinculando…')
    })

    it('cancels from the code form', async () => {
      const wrapper = render({ mode: 'totp' })

      await wrapper.findAll('button[type="button"]').slice(-1)[0]!.trigger('click')

      expect(wrapper.emitted('cancel')).toHaveLength(1)
    })
  })

  describe('when the link was lost', () => {
    it('sends the person back to the Google sign-in, with no form to retry', () => {
      const wrapper = render({ mode: 'expired' })

      expect(wrapper.find('h1').text()).toBe('O vínculo não foi concluído')
      expect(wrapper.find('form').exists()).toBe(false)
      expect(wrapper.find('a[href="/private/oauth2/authorization/google"]').text()).toBe(
        'Entrar com Google',
      )
    })

    it('cancels', async () => {
      const wrapper = render({ mode: 'expired' })

      await wrapper.find('button[type="button"]').trigger('click')

      expect(wrapper.emitted('cancel')).toHaveLength(1)
    })
  })
})
