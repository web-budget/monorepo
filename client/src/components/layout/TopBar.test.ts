import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { h } from 'vue'
import TopBar from '@/components/layout/TopBar.vue'
import { useAppearanceStore } from '@/stores/appearance'
import { useAuthStore } from '@/stores/auth'
import { createTestPlugins, mountInSidebar } from '@/test/mounting'

const session = { name: 'Ana Souza', email: 'ana@example.com', status: 'APPROVED', roles: [] }

async function render(options: { path?: string; withSideMenu?: boolean } = {}) {
  const { router, plugins } = createTestPlugins({
    initialState: { auth: { session } },
    routes: [
      { path: '/registration', component: { render: () => h('div') } },
      { path: '/login', name: 'login', component: { render: () => h('div') } },
    ],
  })
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

  it('logs out and goes to the login', async () => {
    const { wrapper, router } = await render({ path: '/registration' })
    await openUserMenu(wrapper)

    menuItem('Sair').click()
    await flushPromises()

    expect(useAuthStore().logout).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.name).toBe('login')
  })
})
