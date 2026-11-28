import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import ConfigurationLayout from '@/components/layout/ConfigurationLayout.vue'
import DashboardsLayout from '@/components/layout/DashboardsLayout.vue'
import FinancialLayout from '@/components/layout/FinancialLayout.vue'
import RegistrationLayout from '@/components/layout/RegistrationLayout.vue'
import { createTestPlugins } from '@/test/mounting'

async function render(layout: Parameters<typeof mount>[0], path = '/') {
  const { router, plugins } = createTestPlugins({
    initialState: { auth: { session: { name: 'Ana', email: 'ana@example.com' } } },
  })
  await router.push(path)
  await router.isReady()
  return mount(layout, { global: { plugins: plugins as never[] } })
}

function menuLabels(wrapper: Awaited<ReturnType<typeof render>>) {
  return wrapper
    .find('[data-slot="sidebar"]')
    .findAll('[data-sidebar="menu-button"]')
    .map((button) => button.text())
}

describe('layouts', () => {
  it('RegistrationLayout lists the four registrations as links', async () => {
    const wrapper = await render(RegistrationLayout)

    expect(menuLabels(wrapper)).toEqual([
      'Carteiras',
      'Cartões',
      'Classificações',
      'Centros de custo',
    ])
    expect(wrapper.findAll('[data-slot="sidebar-menu"] a')).toHaveLength(4)
    expect(wrapper.find('main').text()).toContain('root')
  })

  it('DashboardsLayout lists the three views, all of them enabled and the overview selected', async () => {
    const wrapper = await render(DashboardsLayout, '/dashboards/overview')

    expect(menuLabels(wrapper)).toEqual(['Visão geral', 'Período', 'Composição'])
    expect(
      wrapper.findAll('[data-slot="sidebar-menu"] a').map((link) => link.attributes('href')),
    ).toEqual(['/dashboards/overview', '/dashboards/period', '/dashboards/composition'])
    expect(wrapper.findAll('[data-slot="sidebar"] button[disabled]')).toHaveLength(0)
    expect(wrapper.findAll('[data-active="true"]').map((button) => button.text())).toEqual([
      'Visão geral',
    ])
  })

  it('FinancialLayout lists the financial entries in two groups, only the movements, the transfers, the statement, the invoices, the imports and the periods enabled', async () => {
    const wrapper = await render(FinancialLayout)

    expect(menuLabels(wrapper)).toEqual([
      'Movimentos',
      'Transferências',
      'Extrato',
      'Recorrentes',
      'Fatura do cartão',
      'Importações',
      'Períodos',
      'Fechamento',
    ])
    expect(
      wrapper.findAll('[data-slot="sidebar-group-label"]').map((label) => label.text()),
    ).toEqual(['Dia a dia', 'Período'])
    expect(wrapper.findAll('[data-slot="sidebar"] button[disabled]')).toHaveLength(0)
    expect(wrapper.findAll('[data-slot="sidebar-menu"] a')).toHaveLength(8)
  })

  it('ConfigurationLayout links the users, the settings and the e-mail and still lists the integrations, disabled', async () => {
    const wrapper = await render(ConfigurationLayout)

    expect(menuLabels(wrapper)).toEqual(['Usuários', 'Parâmetros', 'E-mail', 'Integrações'])
    expect(
      wrapper.findAll('[data-slot="sidebar-menu"] a').map((link) => link.attributes('href')),
    ).toEqual(['/configuration/users', '/configuration/settings', '/configuration/mail'])
    expect(wrapper.findAll('[data-slot="sidebar"] button[disabled]')).toHaveLength(1)
  })

  it('AuthLayout puts the routed step beside the ruled aside, with the brand on top for phones', async () => {
    const wrapper = await render(AuthLayout)

    expect(wrapper.find('[data-slot="auth-aside"]').text()).toContain(
      'Suas contas, passadas a limpo.',
    )
    expect(wrapper.find('[data-slot="auth-brand"]').text()).toContain('webBudget')
    expect(wrapper.find('main').text()).toContain('root')
  })

  it('AuthLayout offers the language selector to whoever has not signed in', async () => {
    const wrapper = await render(AuthLayout)

    const trigger = wrapper.find('main').get('button[aria-label="Idioma"]')

    expect(trigger.text()).toBe('Português (Brasil)')
  })
})
