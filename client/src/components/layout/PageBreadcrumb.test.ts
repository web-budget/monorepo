import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h, type Component } from 'vue'
import { RouterView } from 'vue-router'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'
import { createTestPlugins } from '@/test/mounting'

const leaf: Component = { render: () => h('div') }
const outlet: Component = { render: () => h(RouterView) }

async function render(path: string) {
  const { router, plugins } = createTestPlugins({
    routes: [
      {
        path: '/registration',
        meta: { breadcrumb: 'menu.registration' },
        component: outlet,
        children: [
          { path: '', component: leaf },
          { path: 'wallets', meta: { breadcrumb: 'wallet.menu' }, component: leaf },
          { path: 'again', meta: { breadcrumb: 'menu.registration' }, component: leaf },
          {
            path: 'deep',
            meta: { breadcrumb: 'wallet.form.new' },
            component: outlet,
            children: [
              { path: 'leaf', meta: { breadcrumb: 'wallet.form.editing' }, component: leaf },
            ],
          },
          { path: 'plain', meta: { breadcrumb: 5 }, component: leaf },
        ],
      },
    ],
  })
  await router.push(path)
  await router.isReady()
  return mount(PageBreadcrumb, { global: { plugins } })
}

describe('PageBreadcrumb', () => {
  it('renders nothing for a route without breadcrumb labels', async () => {
    const wrapper = await render('/')

    expect(wrapper.find('nav').exists()).toBe(false)
  })

  it('renders the section as the current page on its own home', async () => {
    const wrapper = await render('/registration')

    expect(wrapper.find('[aria-current="page"]').text()).toBe('Cadastros')
    expect(wrapper.findAll('a')).toHaveLength(0)
  })

  it('links the ancestors and marks the last crumb as the current page', async () => {
    const wrapper = await render('/registration/wallets')

    expect(wrapper.find('a[href="/registration"]').text()).toBe('Cadastros')
    expect(wrapper.find('[aria-current="page"]').text()).toBe('Carteiras')
    expect(wrapper.find('nav').attributes('aria-label')).toBe('Trilha de navegação')
  })

  it('does not repeat a label already shown by an ancestor', async () => {
    const wrapper = await render('/registration/again')

    expect(wrapper.find('[aria-current="page"]').text()).toBe('Cadastros')
    expect(wrapper.findAll('li[data-slot="breadcrumb-item"]')).toHaveLength(1)
  })

  it('ignores a label that is not a string', async () => {
    const wrapper = await render('/registration/plain')

    expect(wrapper.findAll('li[data-slot="breadcrumb-item"]')).toHaveLength(1)
  })

  it('shows only the last two levels on a phone', async () => {
    const wrapper = await render('/registration/deep/leaf')

    const items = wrapper.findAll('li[data-slot="breadcrumb-item"]')
    const separators = wrapper.findAll('li[data-slot="breadcrumb-separator"]')
    expect(items.map((item) => item.classes().includes('max-md:hidden'))).toEqual([
      true,
      false,
      false,
    ])
    expect(separators.map((separator) => separator.classes().includes('max-md:hidden'))).toEqual([
      true,
      false,
    ])
  })

  it('keeps a trail of two levels whole on a phone', async () => {
    const wrapper = await render('/registration/wallets')

    expect(wrapper.html()).not.toContain('max-md:hidden')
  })
})
