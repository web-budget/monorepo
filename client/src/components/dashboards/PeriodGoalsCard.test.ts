import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PeriodGoalsCard from '@/components/dashboards/PeriodGoalsCard.vue'
import { createTestPlugins } from '@/test/mounting'
import type { PeriodDashboardGoals, PeriodFixedVsVariable } from '@/types'

const goals: PeriodDashboardGoals = {
  revenues: { realized: 8000, goal: 9000 },
  expenses: { realized: 3000, goal: 4500 },
}

const fixedVsVariable: PeriodFixedVsVariable = {
  fixed: 1000,
  variable: 3000,
  fixedShareOfRevenueGoal: 0.1111,
}

function render(
  overrides: { goals?: PeriodDashboardGoals; fixedVsVariable?: PeriodFixedVsVariable } = {},
) {
  return mount(PeriodGoalsCard, {
    props: {
      goals: overrides.goals ?? goals,
      fixedVsVariable: overrides.fixedVsVariable ?? fixedVsVariable,
    },
    global: { plugins: createTestPlugins().plugins },
  })
}

describe('PeriodGoalsCard', () => {
  it('shows a row per type and the fixed against the variable', () => {
    const wrapper = render()

    expect(wrapper.find('h2').text()).toBe('Meta × realizado')
    expect(wrapper.findAll('[data-goal]').map((row) => row.attributes('data-goal'))).toEqual([
      'income',
      'expense',
    ])
    expect(wrapper.find('[data-slot="fixed"]').text()).toMatch(/^R\$\s*1\.000,00$/)
    expect(wrapper.find('[data-slot="variable"]').text()).toMatch(/^R\$\s*3\.000,00$/)
    expect(wrapper.find('[data-slot="share"]').text()).toBe('11,1%')
    expect(wrapper.find('[data-slot="fixed-part"]').attributes('style')).toContain('width: 25%')
    expect(wrapper.find('[data-slot="variable-part"]').attributes('style')).toContain('width: 75%')
    expect(wrapper.find('[role="img"]').attributes('aria-label')).toBe('Fixos 25%, variáveis 75%')
  })

  it('has no edit button when both goals exist', () => {
    expect(render().text()).not.toContain('Editar metas')
  })

  it('offers to edit the goals when one is missing', async () => {
    const wrapper = render({
      goals: { ...goals, revenues: { realized: 8000, goal: null } },
      fixedVsVariable: { ...fixedVsVariable, fixedShareOfRevenueGoal: null },
    })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('edit-goals')).toHaveLength(1)
    expect(wrapper.find('[data-slot="no-goal"]').text()).toBe('Sem meta de receita')
    expect(wrapper.find('[data-slot="share"]').text()).toBe('Sem meta de receita')
  })

  it('offers to edit when only the expense goal is missing', () => {
    const wrapper = render({ goals: { ...goals, expenses: { realized: 1, goal: null } } })

    expect(wrapper.text()).toContain('Editar metas')
  })

  it('draws an empty bar when nothing was spent', () => {
    const wrapper = render({
      fixedVsVariable: { fixed: 0, variable: 0, fixedShareOfRevenueGoal: 0 },
    })

    expect(wrapper.find('[data-slot="fixed-part"]').attributes('style')).toContain('width: 0%')
    expect(wrapper.find('[data-slot="variable-part"]').attributes('style')).toContain('width: 0%')
  })
})
