import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { useFinancialPeriodsStore } from '@/stores/financialPeriods'
import { createTestPlugins } from '@/test/mounting'
import FinancialHomeView from '@/views/financial/FinancialHomeView.vue'

function render() {
  const { plugins } = createTestPlugins()
  const financialPeriods = useFinancialPeriodsStore()
  return { financialPeriods, mountView: () => mount(FinancialHomeView, { global: { plugins } }) }
}

describe('FinancialHomeView', () => {
  it('shows the periods with their count and the other items as coming soon', async () => {
    const { financialPeriods, mountView } = render()
    vi.mocked(financialPeriods.count).mockResolvedValue(7)

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('[data-slot="page-title"]').text()).toBe('Financeiro')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe(
      'Lançamentos, faturas e fechamento do período.',
    )
    const links = wrapper.findAll('a[data-slot="module-card"]')
    expect(links.map((link) => link.attributes('href'))).toEqual([
      '/financial/movements',
      '/financial/statement',
      '/financial/periods',
    ])
    expect(links[2]!.find('[data-slot="module-card-count"]').text()).toBe('7')
    expect(financialPeriods.count).toHaveBeenCalledWith('ALL')
    const cards = wrapper.findAll('[aria-disabled="true"]')
    expect(cards).toHaveLength(4)
    expect(cards.every((card) => card.text().includes('Em breve'))).toBe(true)
  })
})
