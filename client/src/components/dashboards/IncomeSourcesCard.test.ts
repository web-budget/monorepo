import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import IncomeSourcesCard from '@/components/dashboards/IncomeSourcesCard.vue'
import { createTestPlugins } from '@/test/mounting'
import type { CompositionIncomeSource } from '@/types'

function render(sources: CompositionIncomeSource[], total: number) {
  return mount(IncomeSourcesCard, {
    props: { sources, total, cut: '2026' },
    global: { plugins: createTestPlugins().plugins },
  })
}

describe('IncomeSourcesCard', () => {
  it('shows the total, the largest source, its weight and the sorted bars', () => {
    const wrapper = render(
      [
        { id: 'a', name: 'Freela', value: 200 },
        { id: 'b', name: 'Salário', value: 800 },
      ],
      1000,
    )

    expect(wrapper.find('h2').text()).toBe('Fontes de renda')
    expect(wrapper.find('[data-slot="income-total"]').text()).toMatch(/^R\$\s*1\.000,00$/)
    expect(wrapper.find('[data-slot="largest"]').text()).toBe('Salário')
    expect(wrapper.find('[data-slot="weight"]').text()).toBe('80,0%')
    expect(wrapper.findAll('[data-slot="rank-name"]').map((name) => name.text())).toEqual([
      'Salário',
      'Freela',
    ])
    expect(wrapper.find('[data-slot="income-empty"]').exists()).toBe(false)
  })

  it('keeps the first source when two tie', () => {
    const wrapper = render(
      [
        { id: 'a', name: 'A', value: 100 },
        { id: 'b', name: 'B', value: 100 },
      ],
      200,
    )

    expect(wrapper.find('[data-slot="largest"]').text()).toBe('A')
  })

  it('says there is no revenue in the cut', () => {
    const wrapper = render([], 0)

    expect(wrapper.find('[data-slot="income-empty"]').text()).toBe('Nenhuma receita em 2026')
    expect(wrapper.find('[data-slot="largest"]').exists()).toBe(false)
  })
})
