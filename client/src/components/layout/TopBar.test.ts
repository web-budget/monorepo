import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import TopBar from '@/components/layout/TopBar.vue'
import { useAppearanceStore } from '@/stores/appearance'
import { useAuthStore } from '@/stores/auth'
import { createTestPlugins, mountInSidebar } from '@/test/mounting'
import type { Role } from '@/types'

const allRoles: Role[] = ['REGISTRATION', 'FINANCIAL', 'ADMINISTRATION', 'DASHBOARDS']

const session = {
  name: 'Ana Souza',
  email: 'ana@example.com',
  status: 'APPROVED',
  roles: allRoles,
}

async function render(options: { path?: string; withSideMenu?: boolean; roles?: Role[] } = {}) {
  const { router, plugins } = createTestPlugins({
    initialState: { auth: { session } },
    routes: [
      { path: '/registration/:rest(.*)*', component: { render: () => h('div') } },
      { path: '/login', name: 'login', component: { render: () => h('div') } },
    ],
  })
  const roles = options.roles ?? allRoles
  vi.mocked(useAuthStore().hasRole).mockImplementation((role) => roles.includes(role))
  await router.push(options.path ?? '/')
  await router.isReady()
  const wrapper = mountInSidebar(TopBar, { withSideMenu: options.withSideMenu ?? true }, plugins)
  return { wrapper, router }
}

async function openUserMenu(wrapper: Awaited<ReturnType<typeof render>>['wrapper']) {
  await wrapper.find('button[aria-label="Menu do usuário"]').trigger('keydown', { key: 'Enter' })
  await flushPromises()
}

function menuItem(selector: string, text: string): HTMLElement {
  const item = [...document.body.querySelectorAll(selector)].find((candidate) =>
    candidate.textContent?.includes(text),
  )
  if (!item) {
    throw new Error(`no menu item "${text}"`)
  }
  return item as HTMLElement
}

function sectionLinks(wrapper: Awaited<ReturnType<typeof render>>['wrapper']) {
  return wrapper.findAll('nav a')
}

describe('TopBar', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('links the section of each permitted role, in the mockup order', async () => {
    const { wrapper } = await render()

    expect(sectionLinks(wrapper).map((link) => [link.text(), link.attributes('href')])).toEqual([
      ['Dashboards', '/dashboards'],
      ['Financeiro', '/financial'],
      ['Cadastros', '/registration'],
      ['Configurações', '/configuration'],
    ])
  })

  it('marks the section of the current route, also on its inner pages', async () => {
    const { wrapper } = await render({ path: '/registration/wallets' })

    expect(sectionLinks(wrapper).map((link) => link.attributes('aria-current'))).toEqual([
      undefined,
      undefined,
      'true',
      undefined,
    ])
  })

  it('marks the section on its own home too', async () => {
    const { wrapper } = await render({ path: '/registration' })

    expect(sectionLinks(wrapper).map((link) => link.attributes('aria-current'))).toEqual([
      undefined,
      undefined,
      'true',
      undefined,
    ])
  })

  it('marks no section on the home page', async () => {
    const { wrapper } = await render()

    expect(sectionLinks(wrapper).some((link) => link.attributes('aria-current'))).toBe(false)
  })

  it('shows the current section next to the symbol for the phone bar', async () => {
    const { wrapper } = await render({ path: '/registration/wallets' })

    expect(wrapper.find('header > span').text()).toBe('Cadastros')
  })

  it('shows no section label on the home page', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('header > span').exists()).toBe(false)
  })

  it('links the brand home', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('header a[href="/"]').text()).toBe('webBudget')
  })

  it('hides the brand on desktop when the side menu already shows it', async () => {
    const withMenu = await render()
    const withoutMenu = await render({ withSideMenu: false })

    expect(withMenu.wrapper.find('header a[href="/"]').classes()).toContain('md:hidden')
    expect(withoutMenu.wrapper.find('header a[href="/"]').classes()).not.toContain('md:hidden')
  })

  it('keeps the side menu toggle on desktop when there is a side menu', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('button[aria-label="Alternar menu lateral"]').classes()).not.toContain(
      'md:hidden',
    )
  })

  it('keeps the toggle on the phone bar only when there is no side menu', async () => {
    const { wrapper } = await render({ withSideMenu: false })

    expect(wrapper.find('button[aria-label="Alternar menu lateral"]').classes()).toContain(
      'md:hidden',
    )
  })

  it('shows the user as initials and name in the button, and as name and e-mail in the menu', async () => {
    const { wrapper } = await render()

    const button = wrapper.find('button[aria-label="Menu do usuário"]')
    expect(button.text()).toContain('Ana Souza')
    expect(button.text()).toContain('AS')

    await openUserMenu(wrapper)

    expect(document.body.textContent).toContain('ana@example.com')
  })

  it('offers the three themes and marks the current mode', async () => {
    const { wrapper } = await render()
    await openUserMenu(wrapper)

    const options = [...document.body.querySelectorAll('[role="menuitemradio"]')]

    expect(options.map((option) => option.textContent?.trim())).toEqual([
      'Claro',
      'Escuro',
      'Sistema',
    ])
    expect(options.map((option) => option.getAttribute('aria-checked'))).toEqual([
      'false',
      'false',
      'true',
    ])
  })

  it('changes the theme from the menu and keeps the menu open', async () => {
    const { wrapper } = await render()
    await openUserMenu(wrapper)

    menuItem('[role="menuitemradio"]', 'Escuro').click()
    await flushPromises()

    expect(useAppearanceStore().setMode).toHaveBeenCalledWith('dark')
    expect(document.body.querySelector('[role="menu"]')).not.toBeNull()
  })

  it('does not offer the trusted devices until #31', async () => {
    const { wrapper } = await render()
    await openUserMenu(wrapper)

    expect(document.body.textContent).not.toContain('Dispositivos confiáveis')
  })

  it('logs out from the user menu', async () => {
    const { wrapper } = await render({ path: '/registration' })
    await openUserMenu(wrapper)

    menuItem('[role="menuitem"]', 'Sair').click()
    await flushPromises()

    expect(useAuthStore().logout).toHaveBeenCalledTimes(1)
  })

  it.each([
    [['REGISTRATION'], ['Cadastros']],
    [['FINANCIAL'], ['Financeiro']],
    [['ADMINISTRATION'], ['Configurações']],
    [['DASHBOARDS'], ['Dashboards']],
    [
      ['FINANCIAL', 'ADMINISTRATION'],
      ['Financeiro', 'Configurações'],
    ],
    [[], []],
  ] as [Role[], string[]][])(
    'shows only the sections the roles %j give access to',
    async (roles, expected) => {
      const { wrapper } = await render({ roles })

      expect(sectionLinks(wrapper).map((link) => link.text())).toEqual(expected)
    },
  )

  it('does not mark a section the user cannot reach', async () => {
    const { wrapper } = await render({ path: '/registration', roles: ['FINANCIAL'] })

    expect(sectionLinks(wrapper).some((link) => link.attributes('aria-current'))).toBe(false)
  })
})
