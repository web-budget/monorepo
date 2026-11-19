import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import TotpEnrollStep from '@/components/auth/TotpEnrollStep.vue'
import { createTestPlugins } from '@/test/mounting'
import { settle } from '@/test/settle'

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const enrollment = { secretKey: 'JBSWY3DPEHPK3PXP', qrCodeDataUri: 'data:image/png;base64,AAAA' }

function render(props: Record<string, unknown> = {}) {
  const { plugins } = createTestPlugins()
  return mount(TotpEnrollStep, {
    attachTo: document.body,
    props: { enrollment, loading: false, failure: null, ...props },
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

describe('TotpEnrollStep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the QR code and the key in groups of four', () => {
    const wrapper = render()

    expect(wrapper.find('img').attributes('src')).toBe(enrollment.qrCodeDataUri)
    expect(wrapper.find('img').attributes('alt')).toBe('QR code para cadastrar o autenticador')
    expect(wrapper.find('[data-slot="secret-key"]').text()).toBe('JBSW Y3DP EHPK 3PXP')
  })

  it('copies the key without the spaces', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const wrapper = render()

    await wrapper.find('button[type="button"]').trigger('click')
    await settle()

    expect(writeText).toHaveBeenCalledWith('JBSWY3DPEHPK3PXP')
    expect(toast.success).toHaveBeenCalledWith('Chave copiada', expect.anything())
  })

  it('sends the code on its own at the sixth digit, once', async () => {
    const wrapper = render()

    await typeCode(wrapper, '482015')

    expect(wrapper.emitted('submit')).toEqual([['482015']])
  })

  it('keeps the button off until the code is complete, then sends with it', async () => {
    const wrapper = render()
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()

    await typeCode(wrapper, '48201')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('does not send again while the previous code is being checked', async () => {
    const wrapper = render({ loading: true })

    await typeCode(wrapper, '482015')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('button[type="submit"]').text()).toBe('Ativando…')
  })

  it('clears the boxes and says so when the code was wrong', async () => {
    const wrapper = render()
    await typeCode(wrapper, '482015')

    await wrapper.setProps({ failure: 'invalid-code' })
    await settle()

    expect(wrapper.text()).toContain('Código inválido')
    const values = wrapper
      .findAll('input[autocomplete="one-time-code"]')
      .map((input) => (input.element as HTMLInputElement).value)
    expect(values.every((value) => value === '')).toBe(true)
    expect(document.activeElement).toBe(wrapper.find('input[autocomplete="one-time-code"]').element)
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
    expect(wrapper.text()).not.toContain('Código inválido')
  })

  it('shows no alert without a failure', () => {
    expect(render().find('[data-slot="step-failure"]').exists()).toBe(false)
  })

  it('lets the person use another account', async () => {
    const wrapper = render()

    await wrapper.findAll('button[type="button"]').slice(-1)[0]!.trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
