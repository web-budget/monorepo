import { mount } from '@vue/test-utils'
import { beforeAll, describe, expect, it } from 'vitest'
import RegisterStep from '@/components/auth/RegisterStep.vue'
import { installZodErrorMap } from '@/schemas/zodErrorMap'
import { createTestPlugins } from '@/test/mounting'
import { settle } from '@/test/settle'

function render(props: Record<string, unknown> = {}) {
  const { plugins } = createTestPlugins()
  return mount(RegisterStep, {
    props: { loading: false, rateLimited: false, ...props },
    global: { plugins },
  })
}

async function fill(wrapper: ReturnType<typeof render>, password = 'Caderno1') {
  await wrapper.find('input[autocomplete="name"]').setValue('Maria')
  await wrapper.find('input[type="email"]').setValue('maria@example.com')
  await wrapper.find('input[autocomplete="new-password"]').setValue(password)
}

describe('RegisterStep', () => {
  beforeAll(() => {
    installZodErrorMap()
  })

  it('explains that an administrator approves the account', () => {
    const wrapper = render()

    expect(wrapper.find('h1').text()).toBe('Criar conta')
    expect(wrapper.text()).toContain('Um administrador aprova a conta antes do primeiro acesso.')
  })

  it('emits the registration once it is valid', async () => {
    const wrapper = render()

    await fill(wrapper)
    await wrapper.find('form').trigger('submit')
    await settle()

    expect(wrapper.emitted('submit')).toEqual([
      [{ name: 'Maria', email: 'maria@example.com', password: 'Caderno1' }],
    ])
  })

  it('does not emit an incomplete registration', async () => {
    const wrapper = render()

    await wrapper.find('form').trigger('submit')
    await settle()

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.text()).toContain('Campo obrigatório')
  })

  it('ticks the password requirements while the person types', async () => {
    const wrapper = render()

    await fill(wrapper, 'Caderno1')

    expect(wrapper.findAll('[data-slot="password-requirements"] [data-met="true"]')).toHaveLength(3)
  })

  it('refuses a password that fails the requirements', async () => {
    const wrapper = render()

    await fill(wrapper, 'caderno')
    await wrapper.find('form').trigger('submit')
    await settle()

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.text()).toContain('A senha não atende aos requisitos')
  })

  it('warns about too many registrations', () => {
    const wrapper = render({ rateLimited: true })

    expect(wrapper.find('[data-slot="step-failure"]').text()).toContain('Muitos cadastros seguidos')
  })

  it('shows no alert by default', () => {
    expect(render().find('[data-slot="step-failure"]').exists()).toBe(false)
  })

  it('disables the form and says so while it sends', () => {
    const wrapper = render({ loading: true })

    expect(wrapper.find('fieldset').attributes('disabled')).toBeDefined()
    expect(wrapper.find('button[type="submit"]').text()).toBe('Criando…')
  })

  it('goes back to the login', async () => {
    const wrapper = render()

    await wrapper.find('button[type="button"]:not([aria-label])').trigger('click')

    expect(wrapper.emitted('back')).toHaveLength(1)
  })
})
