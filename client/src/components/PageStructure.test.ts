import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import PageStructure from '@/components/PageStructure.vue'
import { useTrustedDevicesDialog } from '@/composables/useTrustedDevicesDialog'
import { useAuthStore } from '@/stores/auth'
import { mockMatchMedia } from '@/test/matchMedia'
import { createTestPlugins } from '@/test/mounting'
import type { Role } from '@/types'

const allRoles: Role[] = ['DASHBOARDS', 'FINANCIAL', 'REGISTRATION', 'ADMINISTRATION']

async function render(
  options: { props?: Record<string, unknown>; narrow?: boolean; roles?: Role[] } = {},
) {
  const { router, plugins } = createTestPlugins({
    initialState: {
      auth: { session: { name: 'Ana Souza', email: 'ana@example.com', roles: allRoles } },
    },
    routes: [
      {
        path: '/registration',
        meta: { breadcrumb: 'menu.registration', narrow: options.narrow },
        component: { render: () => h('div', 'section page') },
      },
    ],
  })
  const roles = options.roles ?? allRoles
  vi.mocked(useAuthStore().hasRole).mockImplementation((role) => roles.includes(role))
  await router.push(options.narrow === undefined ? '/' : '/registration')
  await router.isReady()
  return mount(PageStructure, {
    props: options.props,
    slots: { 'side-menu': () => h('p', 'side menu content') },
    attachTo: document.body,
    global: { plugins },
  })
}

function clearSidebarCookie() {
  document.cookie = 'sidebar_state=; path=/; max-age=0'
}

describe('PageStructure', () => {
  let media: ReturnType<typeof mockMatchMedia>

  beforeEach(() => {
    media = mockMatchMedia()
    clearSidebarCookie()
    document.body.replaceChildren()
  })

  afterEach(() => {
    media.restore()
    clearSidebarCookie()
  })

  it('renders the top bar and the routed page', async () => {
    const wrapper = await render()

    expect(wrapper.find('header').exists()).toBe(true)
    expect(wrapper.find('main').text()).toContain('root')
  })

  it('renders the side menu slot inside the sidebar, under the brand and over the version', async () => {
    const wrapper = await render()

    const sidebar = wrapper.find('[data-slot="sidebar"]')
    expect(sidebar.text()).toContain('side menu content')
    expect(sidebar.find('a[href="/"]').text()).toBe('webBudget')
    expect(sidebar.find('[data-slot="sidebar-footer"]').text()).toBe('webBudget dev')
  })

  it('no longer has a page footer', async () => {
    const wrapper = await render()

    expect(wrapper.find('footer').exists()).toBe(false)
  })

  it('omits the sidebar when the side menu is disabled', async () => {
    const wrapper = await render({ props: { enableSideMenu: false } })

    expect(wrapper.find('[data-slot="sidebar"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('side menu content')
    expect(wrapper.find('main').text()).toContain('root')
  })

  it('collapses the sidebar from the top bar toggle and remembers it in the next page structure', async () => {
    const first = await render()

    expect(first.find('[data-slot="sidebar"]').attributes('data-state')).toBe('expanded')

    await first.find('button[aria-label="Alternar menu lateral"]').trigger('click')

    expect(first.find('[data-slot="sidebar"]').attributes('data-state')).toBe('collapsed')

    const second = await render()

    expect(second.find('[data-slot="sidebar"]').attributes('data-state')).toBe('collapsed')
  })

  it('toggles the sidebar with Ctrl+B', async () => {
    const wrapper = await render()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }))
    await flushPromises()

    expect(wrapper.find('[data-slot="sidebar"]').attributes('data-state')).toBe('collapsed')
  })

  it('keeps the content as wide as the page for a list', async () => {
    const wrapper = await render({ narrow: false })

    expect(wrapper.find('.max-w-\\[960px\\]').exists()).toBe(false)
  })

  it('limits a form or detail to 960px, with the breadcrumb inside the same container', async () => {
    const wrapper = await render({ narrow: true })

    const container = wrapper.find('.max-w-\\[960px\\]')
    expect(container.exists()).toBe(true)
    expect(container.find('nav[aria-label="Trilha de navegação"]').exists()).toBe(true)
    expect(container.text()).toContain('section page')
  })

  describe('on a phone', () => {
    beforeEach(() => {
      media.set('(max-width: 767px)', true)
    })

    async function openMenu(wrapper: Awaited<ReturnType<typeof render>>) {
      await wrapper.find('button[aria-label="Alternar menu lateral"]').trigger('click')
      await flushPromises()
    }

    it('opens a sheet with every permitted section and its items, not the section slot', async () => {
      const wrapper = await render()
      await openMenu(wrapper)

      const sheet = document.body.querySelector('[data-mobile="true"]')!
      const groups = [...sheet.querySelectorAll('[data-slot="sidebar-group-label"]')].map(
        (label) => label.textContent,
      )

      expect(groups).toEqual(['Dashboards', 'Financeiro', 'Cadastros', 'Configurações'])
      expect(sheet.querySelector('a[href="/registration/wallets"]')).not.toBeNull()
      expect(sheet.textContent).not.toContain('side menu content')
    })

    it('opens the sheet even on a page without a side menu', async () => {
      const wrapper = await render({ props: { enableSideMenu: false } })
      await openMenu(wrapper)

      expect(document.body.querySelector('[data-mobile="true"]')).not.toBeNull()
    })

    it('lists only the sections the roles give access to', async () => {
      const wrapper = await render({ roles: ['FINANCIAL'] })
      await openMenu(wrapper)

      const groups = [
        ...document.body.querySelectorAll('[data-mobile="true"] [data-slot="sidebar-group-label"]'),
      ].map((label) => label.textContent)
      expect(groups).toEqual(['Financeiro'])
    })

    it('shows the user, the theme and the logout in the sheet footer', async () => {
      const wrapper = await render()
      await openMenu(wrapper)

      const footer = document.body.querySelector(
        '[data-mobile="true"] [data-slot="sidebar-footer"]',
      )!
      expect(footer.textContent).toContain('Ana Souza')
      expect(footer.textContent).toContain('ana@example.com')
      expect(footer.querySelectorAll('[role="radio"]')).toHaveLength(3)

      ;(footer.querySelector('button[aria-label="Sair"]') as HTMLElement).click()

      expect(useAuthStore().logout).toHaveBeenCalledTimes(1)
    })

    it('opens the trusted devices from the sheet footer and closes the sheet', async () => {
      const wrapper = await render()
      await openMenu(wrapper)

      ;(
        document.body.querySelector(
          '[data-mobile="true"] button[aria-label="Dispositivos confiáveis"]',
        ) as HTMLElement
      ).click()
      await flushPromises()

      expect(useTrustedDevicesDialog().open.value).toBe(true)
      expect(document.body.querySelector('[data-mobile="true"]')).toBeNull()
      useTrustedDevicesDialog().close()
    })

    it('closes the sheet with the close button', async () => {
      const wrapper = await render()
      await openMenu(wrapper)

      ;(document.body.querySelector('button[aria-label="Fechar menu"]') as HTMLElement).click()
      await flushPromises()

      expect(document.body.querySelector('[data-mobile="true"]')).toBeNull()
    })

    it('closes the sheet when the brand is clicked', async () => {
      const wrapper = await render()
      await openMenu(wrapper)

      ;(document.body.querySelector('[data-mobile="true"] a[href="/"]') as HTMLElement).click()
      await flushPromises()

      expect(document.body.querySelector('[data-mobile="true"]')).toBeNull()
    })
  })
})
