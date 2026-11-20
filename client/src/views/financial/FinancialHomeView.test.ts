import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createTestPlugins } from '@/test/mounting'
import FinancialHomeView from '@/views/financial/FinancialHomeView.vue'

describe('FinancialHomeView', () => {
  it('shows the four financial items as coming soon, none of them clickable', () => {
    const { plugins } = createTestPlugins()

    const wrapper = mount(FinancialHomeView, { global: { plugins } })

    expect(wrapper.find('[data-slot="page-title"]').text()).toBe('Financeiro')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe(
      'Lançamentos, faturas e fechamento do período.',
    )
    expect(wrapper.find('a').exists()).toBe(false)
    const cards = wrapper.findAll('[aria-disabled="true"]')
    expect(cards).toHaveLength(4)
    expect(cards.every((card) => card.text().includes('Em breve'))).toBe(true)
  })
})
