import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import TopBar from '@/components/layout/TopBar.vue'
import { useAppearanceStore } from '@/stores/appearance'
import { useAuthStore } from '@/stores/auth'
import { createTestPlugins, mountInSidebar } from '@/test/mounting'
import type { Role } from '@/types'

const allRoles: Role[] = ['REGISTRATION', 'FINANCIAL', 'ADMINISTRATION', 'DASHBOARDS']

const session = { name: 'Ana Souza', email: 'ana@example.com', status: 'APPROVED', roles: allRoles }

async function render(options: { path?: string; withSideMenu?: boolean; roles?: Role[] } = {}) {
  const { router, plugins } = createTestPlugins({
    initialState: { auth: { session } },
    routes: [
      { path: '/registration', component: { render: () => h('div') } },
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

function menuItem(text: string): HTMLElement {
  const item = [...document.body.querySelectorAll('[role="menuitem"]')].find((candidate) =>
    candidate.textContent?.includes(text),
  )
  if (!item) {
    throw new Error(`no menu item "${text}"`)
  }
  return item as HTMLElement
}

describe('TopBar', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('shows the logo as a link home and the section links', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('header a[href="/"]').text()).toBe('webBudget')
    const links = wrapper.findAll('nav a').map((link) => [link.text(), link.attributes('href')])
    expect(links).toEqual([
      ['Cadastros', '/registration'],
      ['Financeiro', '/financial'],
      ['Configurações', '/configuration'],
    ])
  })

  it('highlights the section of the current route', async () => {
    const { wrapper } = await render({ path: '/registration' })

    const classes = wrapper.findAll('nav a').map((link) => link.classes().includes('bg-secondary'))
    expect(classes).toEqual([true, false, false])
  })

  it('highlights no section on the home page', async () => {
    const { wrapper } = await render()

    expect(wrapper.findAll('nav a').some((link) => link.classes().includes('bg-secondary'))).toBe(
      false,
    )
  })

  it('offers the side menu toggle only with a side menu', async () => {
    const withMenu = await render()
    const withoutMenu = await render({ withSideMenu: false })

    expect(withMenu.wrapper.find('button[aria-label="Alternar menu lateral"]').exists()).toBe(true)
    expect(withoutMenu.wrapper.find('button[aria-label="Alternar menu lateral"]').exists()).toBe(
      false,
    )
  })

  it('shows the user in the menu button and in the open menu', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('button[aria-label="Menu do usuário"]').text()).toContain('Ana Souza')

    await openUserMenu(wrapper)

    expect(document.body.textContent).toContain('ana@example.com')
  })

  it('toggles the theme from the user menu and names the action after the current theme', async () => {
    const { wrapper } = await render()
    await openUserMenu(wrapper)

    expect(menuItem('Tema escuro')).toBeTruthy()
    menuItem('Tema escuro').click()

    expect(useAppearanceStore().toggleDark).toHaveBeenCalledTimes(1)
  })

  it('offers the light theme while the dark one is on', async () => {
    const { wrapper } = await render()
    useAppearanceStore().dark = true
    await openUserMenu(wrapper)

    expect(menuItem('Tema claro')).toBeTruthy()
  })

  it('logs out from the user menu', async () => {
    const { wrapper } = await render({ path: '/registration' })
    await openUserMenu(wrapper)

    menuItem('Sair').click()
    await flushPromises()

    expect(useAuthStore().logout).toHaveBeenCalledTimes(1)
  })

  it.each([
    [['REGISTRATION'], ['Cadastros']],
    [['FINANCIAL'], ['Financeiro']],
    [['ADMINISTRATION'], ['Configurações']],
    [
      ['FINANCIAL', 'ADMINISTRATION'],
      ['Financeiro', 'Configurações'],
    ],
    [['DASHBOARDS'], []],
  ] as [Role[], string[]][])(
    'shows only the sections the roles %j give access to',
    async (roles, expected) => {
      const { wrapper } = await render({ roles })

      expect(wrapper.findAll('nav a').map((link) => link.text())).toEqual(expected)
    },
  )

  it('offers only the permitted sections in the user menu as well', async () => {
    const { wrapper } = await render({ roles: ['FINANCIAL'] })
    await openUserMenu(wrapper)

    const sectionItems = [...document.body.querySelectorAll('[role="menuitem"]')].filter((item) =>
      item.classList.contains('md:hidden'),
    )
    expect(sectionItems.map((item) => item.textContent?.trim())).toEqual(['Financeiro'])
  })

  it('does not highlight a section the user cannot reach', async () => {
    const { wrapper } = await render({ path: '/registration', roles: ['FINANCIAL'] })

    expect(wrapper.findAll('nav a').some((link) => link.classes().includes('bg-secondary'))).toBe(
      false,
    )
  })

  it('leaves out the section separator of the user menu when no section is permitted', async () => {
    const { wrapper } = await render({ roles: [] })
    await openUserMenu(wrapper)

    expect(document.body.querySelectorAll('[role="separator"].md:hidden')).toHaveLength(0)
  })
})
