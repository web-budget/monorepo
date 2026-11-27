import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import GoalRow from '@/components/dashboards/GoalRow.vue'
import { createTestPlugins } from '@/test/mounting'
import type { GoalKind } from '@/utils/goalSignal'

function render(kind: GoalKind, realized: number, goal: number | null) {
  return mount(GoalRow, {
    props: { kind, label: kind === 'income' ? 'Receitas' : 'Despesas', realized, goal },
    global: { plugins: createTestPlugins().plugins },
  })
}

describe('GoalRow', () => {
  it('shows an expense inside the limit in green with what is left', () => {
    const wrapper = render('expense', 400, 1000)

    expect(wrapper.find('[data-slot="meter"]').attributes('data-signal')).toBe('ok')
    expect(wrapper.find('[data-slot="percentage"]').text()).toBe('40%')
    expect(wrapper.find('[data-slot="goal-text"]').text()).toMatch(
      /^Sobram R\$\s*600,00 até o limite$/,
    )
    expect(wrapper.find('[data-slot="goal-state"]').text()).toBe('Dentro do limite')
    expect(wrapper.text()).toContain('de')
  })

  it('shows an expense from 90% in amber and above 100% in red with the excess', () => {
    const near = render('expense', 950, 1000)
    expect(near.find('[data-slot="meter"]').attributes('data-signal')).toBe('warn')
    expect(near.find('[data-slot="goal-state"]').text()).toBe('Perto do limite')

    const over = render('expense', 1200, 1000)
    expect(over.find('[data-slot="meter"]').attributes('data-signal')).toBe('over')
    expect(over.find('[data-slot="goal-text"]').text()).toMatch(/^R\$\s*200,00 acima do limite$/)
    expect(over.find('[data-slot="goal-state"]').text()).toBe('Acima do limite')
    expect(over.find('[data-slot="meter-fill"]').attributes('style')).toContain('width: 100%')
  })

  it('treats the income goal as a floor', () => {
    const below = render('income', 700, 1000)
    expect(below.find('[data-slot="meter"]').attributes('data-signal')).toBe('warn')
    expect(below.find('[data-slot="goal-text"]').text()).toMatch(
      /^Faltam R\$\s*300,00 para a meta$/,
    )
    expect(below.find('[data-slot="goal-state"]').text()).toBe('Abaixo da meta')

    const above = render('income', 1300, 1000)
    expect(above.find('[data-slot="meter"]').attributes('data-signal')).toBe('ok')
    expect(above.find('[data-slot="goal-text"]').text()).toMatch(/^R\$\s*300,00 acima da meta$/)
    expect(above.find('[data-slot="goal-state"]').text()).toBe('Meta atingida')

    const equal = render('income', 1000, 1000)
    expect(equal.find('[data-slot="goal-text"]').text()).toBe('Igual à meta')
  })

  it('writes the difference of an exact expense goal as what is left', () => {
    const wrapper = render('expense', 1000, 1000)

    expect(wrapper.find('[data-slot="goal-text"]').text()).toMatch(
      /^Sobram R\$\s*0,00 até o limite$/,
    )
  })

  it('only shows what was realized and warns when the goal is missing or zero', () => {
    const missing = render('income', 700, null)
    expect(missing.find('[data-slot="meter"]').exists()).toBe(false)
    expect(missing.find('[data-slot="no-goal"]').text()).toBe('Sem meta de receita')
    expect(missing.text()).not.toMatch(/ de R\$/)

    const zero = render('expense', 10, 0)
    expect(zero.find('[data-slot="meter"]').exists()).toBe(false)
    expect(zero.find('[data-slot="no-goal"]').text()).toBe('Sem meta de despesa')
  })
})
