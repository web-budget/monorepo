import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BackToLogin from '@/components/auth/BackToLogin.vue'
import { createTestPlugins } from '@/test/mounting'

async function render(props: { button?: boolean }) {
  const { router, plugins } = createTestPlugins({
    routes: [{ path: '/login', name: 'login', component: { render: () => null } }],
  })
  await router.push('/')
  await router.isReady()
  return mount(BackToLogin, { props, global: { plugins } })
}

describe('BackToLogin', () => {
  it('is a text link by default', async () => {
    const wrapper = await render({})

    expect(wrapper.find('a[href="/login"]').text()).toBe('Voltar para o login')
    expect(wrapper.find('a').classes()).not.toContain('w-full')
  })

  it('is a full-width button when asked', async () => {
    const wrapper = await render({ button: true })

    expect(wrapper.find('a[href="/login"]').text()).toBe('Voltar para o login')
    expect(wrapper.find('a').classes()).toContain('w-full')
  })
})
