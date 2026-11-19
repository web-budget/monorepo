import { Wallet } from 'lucide-vue-next'
import { describe, expect, it } from 'vitest'
import SideMenu from '@/components/layout/SideMenu.vue'
import type { MenuGroup } from '@/components/layout/menu'
import { createTestPlugins, mountInSidebar } from '@/test/mounting'

const items: MenuGroup[] = [
  {
    label: 'menu.registration',
    items: [
      { label: 'wallet.menu', icon: Wallet, to: '/registration/wallets' },
      { label: 'card.menu', to: '/registration/cards' },
      { label: 'users.menu' },
      { label: 'classification.menu', to: '/registration/classifications', visible: false },
    ],
  },
  { label: 'menu.financial', items: [{ label: 'period-closing.menu' }] },
]

async function render(path: string) {
  const { router, plugins } = createTestPlugins({
    routes: [{ path: '/registration/:rest(.*)*', component: { render: () => null } }],
  })
  await router.push(path)
  await router.isReady()
  return mountInSidebar(SideMenu, { items }, plugins)
}

describe('SideMenu', () => {
  it('renders each group under its translated label', async () => {
    const wrapper = await render('/')

    const labels = wrapper.findAll('[data-slot="sidebar-group-label"]').map((label) => label.text())
    expect(labels).toEqual(['Cadastros', 'Financeiro'])
  })

  it('renders an item with a destination as a link', async () => {
    const wrapper = await render('/')

    const link = wrapper.find('a[href="/registration/wallets"]')
    expect(link.text()).toBe('Carteiras')
    expect(link.find('svg').exists()).toBe(true)
  })

  it('renders an item without an icon', async () => {
    const wrapper = await render('/')

    expect(wrapper.find('a[href="/registration/cards"]').find('svg').exists()).toBe(false)
  })

  it('marks the item of the current route as active', async () => {
    const wrapper = await render('/registration/wallets')

    expect(wrapper.find('[data-active="true"]').text()).toBe('Carteiras')
    expect(wrapper.findAll('[data-active="true"]')).toHaveLength(1)
  })

  it('highlights the label of the current item with the marker', async () => {
    const wrapper = await render('/registration/wallets')

    expect(wrapper.find('a[href="/registration/wallets"] span').classes()).toContain('marker')
    expect(wrapper.find('a[href="/registration/cards"] span').classes()).not.toContain('marker')
  })

  it('renders an item without a destination as disabled', async () => {
    const wrapper = await render('/')

    const disabled = wrapper.findAll('button[disabled]')
    expect(disabled.map((button) => button.text())).toEqual(['Usuários', 'Encerramento do período'])
    expect(disabled[0]!.attributes('title')).toBe('Em breve')
    expect(wrapper.findAll('[data-active="true"]')).toHaveLength(0)
  })

  it('hides an item that is not visible', async () => {
    const wrapper = await render('/')

    expect(wrapper.text()).not.toContain('Classificações')
  })

  it('closes the mobile menu when an item is clicked', async () => {
    const wrapper = await render('/')

    await wrapper.find('a[href="/registration/cards"]').trigger('click')

    expect(wrapper.find('a[href="/registration/cards"]').exists()).toBe(true)
  })
})
