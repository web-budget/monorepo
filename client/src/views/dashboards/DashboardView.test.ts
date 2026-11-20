import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createTestPlugins } from '@/test/mounting'
import DashboardView from '@/views/dashboards/DashboardView.vue'

describe('DashboardView', () => {
  it('shows the title and the description of the dashboard with the empty state, and no numbers', () => {
    const { plugins } = createTestPlugins()

    const wrapper = mount(DashboardView, {
      props: { title: 'dashboards.by-wallet', description: 'dashboards.description.by-wallet' },
      global: { plugins },
    })

    expect(wrapper.find('[data-slot="page-title"]').text()).toBe('Por carteira')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe(
      'Quanto entra e sai de cada carteira.',
    )
    const state = wrapper.find('[role="status"]')
    expect(state.text()).toContain('Os dashboards chegam com o financeiro')
    expect(state.text()).not.toMatch(/\d/)
  })
})
