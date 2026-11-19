import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import TotpVerifyStep from '@/components/auth/TotpVerifyStep.vue'
import { createTestPlugins } from '@/test/mounting'
import { settle } from '@/test/settle'

function render(props: Record<string, unknown> = {}) {
  const { plugins } = createTestPlugins()
  return mount(TotpVerifyStep, {
    attachTo: document.body,
    props: { loading: false, failure: null, ...props },
    global: { plugins },
  })
}

async function typeCode(wrapper: ReturnType<typeof render>, code: string) {
  const boxes = wrapper.findAll('input[autocomplete="one-time-code"]')
  for (const [index, digit] of [...code].entries()) {
    await boxes[index]!.setValue(digit)
    await settle()
  }
}

describe('TotpVerifyStep', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('asks for the code of the authenticator', () => {
    const wrapper = render()

    expect(wrapper.find('h1').text()).toBe('Código de verificação')
    expect(wrapper.findAll('input[autocomplete="one-time-code"]')).toHaveLength(6)
  })

  it('does not trust the device unless the person says so', async () => {
    const wrapper = render()

    await typeCode(wrapper, '482015')

    expect(wrapper.emitted('submit')).toEqual([[{ code: '482015', trustDevice: false }]])
  })

  it('sends that the device is trusted when the box is ticked', async () => {
    const wrapper = render()

    await wrapper.find('button[role="checkbox"]').trigger('click')
    await typeCode(wrapper, '482015')

    expect(wrapper.emitted('submit')).toEqual([[{ code: '482015', trustDevice: true }]])
  })

  it('sends with the button once the code is complete, and never before', async () => {
    const wrapper = render()
    await typeCode(wrapper, '4820')

    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('does not send again while a code is being checked', async () => {
    const wrapper = render({ loading: true })

    await typeCode(wrapper, '482015')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('button[type="submit"]').text()).toBe('Verificando…')
  })

  it('clears the boxes, marks them and says so when the code was wrong', async () => {
    const wrapper = render()
    await typeCode(wrapper, '482015')

    await wrapper.setProps({ failure: 'invalid-code' })
    await settle()

    expect(wrapper.text()).toContain('Código inválido')
    const boxes = wrapper.findAll('input[autocomplete="one-time-code"]')
    expect(boxes.every((box) => (box.element as HTMLInputElement).value === '')).toBe(true)
    expect(boxes[0]!.attributes('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(boxes[0]!.element)
  })

  it('leaves the boxes alone when the failure goes away', async () => {
    const wrapper = render()
    await typeCode(wrapper, '482015')
    await wrapper.setProps({ failure: 'invalid-code' })
    await typeCode(wrapper, '123456')

    await wrapper.setProps({ failure: null })
    await settle()

    const values = wrapper
      .findAll('input[autocomplete="one-time-code"]')
      .map((input) => (input.element as HTMLInputElement).value)
    expect(values.join('')).toBe('123456')
  })

  it('warns about too many attempts', () => {
    const wrapper = render({ failure: 'rate-limit' })

    expect(wrapper.find('[data-slot="step-failure"]').text()).toContain(
      'Muitas tentativas seguidas',
    )
  })

  it('lets the person use another account', async () => {
    const wrapper = render()

    await wrapper.findAll('button[type="button"]').slice(-1)[0]!.trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
