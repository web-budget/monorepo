import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AuthAside from '@/components/auth/AuthAside.vue'
import { createTestPlugins } from '@/test/mounting'

describe('AuthAside', () => {
  it('shows the brand, the pitch, the three features and the version', () => {
    const wrapper = mount(AuthAside, { global: { plugins: createTestPlugins().plugins } })

    expect(wrapper.text()).toContain('webBudget')
    expect(wrapper.find('h2').text()).toBe('Suas contas, passadas a limpo.')
    expect(wrapper.findAll('li')).toHaveLength(3)
    expect(wrapper.text()).toContain(`v${__APP_VERSION__}`)
  })
})
