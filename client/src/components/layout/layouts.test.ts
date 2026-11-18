import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import ConfigurationLayout from '@/components/layout/ConfigurationLayout.vue'
import FinancialLayout from '@/components/layout/FinancialLayout.vue'
import HomeLayout from '@/components/layout/HomeLayout.vue'
import RegistrationLayout from '@/components/layout/RegistrationLayout.vue'
import { createTestPlugins } from '@/test/mounting'

async function render(layout: Parameters<typeof mount>[0]) {
  const { router, plugins } = createTestPlugins({
    initialState: { auth: { session: { name: 'Ana', email: 'ana@example.com' } } },
  })
  await router.push('/')
  await router.isReady()
  return mount(layout, { global: { plugins: plugins as never[] } })
}

function menuLabels(wrapper: Awaited<ReturnType<typeof render>>) {
  return wrapper
    .find('[data-slot="sidebar"]')
    .findAll('[data-slot="sidebar-menu-button"]')
    .map((button) => button.text())
}

describe('layouts', () => {
  it('RegistrationLayout lists the five registrations as links', async () => {
    const wrapper = await render(RegistrationLayout)

    expect(menuLabels(wrapper)).toEqual([
      'Cartões',
      'Carteiras',
      'Classificações',
      'Centros de custos',
      'Períodos financeiros',
    ])
    expect(wrapper.findAll('[data-slot="sidebar"] a')).toHaveLength(5)
    expect(wrapper.find('main').text()).toContain('root')
  })

  it('FinancialLayout lists the financial entries, still disabled', async () => {
    const wrapper = await render(FinancialLayout)

    expect(menuLabels(wrapper)).toEqual([
      'Movimentos do período',
      'Movimentos recorrentes',
      'Fatura do cartão de crédito',
      'Encerramento do período',
    ])
    expect(wrapper.findAll('[data-slot="sidebar"] button[disabled]')).toHaveLength(4)
  })

  it('ConfigurationLayout links the users and still lists the integrations, disabled', async () => {
    const wrapper = await render(ConfigurationLayout)

    expect(menuLabels(wrapper)).toEqual(['Usuários', 'Integrações'])
    expect(
      wrapper.findAll('[data-slot="sidebar"] a').map((link) => link.attributes('href')),
    ).toEqual(['/configuration/users'])
    expect(wrapper.findAll('[data-slot="sidebar"] button[disabled]')).toHaveLength(1)
  })

  it('HomeLayout has no side menu', async () => {
    const wrapper = await render(HomeLayout)

    expect(wrapper.find('[data-slot="sidebar"]').exists()).toBe(false)
    expect(wrapper.find('main').text()).toContain('root')
  })

  it('AuthLayout puts the routed step beside the ruled aside, with the brand on top for phones', async () => {
    const wrapper = await render(AuthLayout)

    expect(wrapper.find('[data-slot="auth-aside"]').text()).toContain(
      'Suas contas, passadas a limpo.',
    )
    expect(wrapper.find('[data-slot="auth-brand"]').text()).toContain('webBudget')
    expect(wrapper.find('main').text()).toContain('root')
  })
})
