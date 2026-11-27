import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MeterBar from '@/components/dashboards/MeterBar.vue'

describe('MeterBar', () => {
  it('fills the width asked for and exposes it as a meter', () => {
    const wrapper = mount(MeterBar, { props: { width: 42.4, label: 'Receitas: 42%' } })

    const meter = wrapper.find('[role="meter"]')
    expect(meter.attributes('aria-label')).toBe('Receitas: 42%')
    expect(meter.attributes('aria-valuenow')).toBe('42')
    expect(wrapper.find('[data-slot="meter-fill"]').attributes('style')).toContain('width: 42.4%')
    expect(meter.attributes('data-signal')).toBe('ok')
  })

  it.each([
    ['ok', 'bg-primary'],
    ['warn', 'bg-[color-mix(in_oklch,var(--highlight),var(--highlight-foreground)_35%)]'],
    ['over', 'bg-expense'],
  ] as const)('paints the %s signal', (signal, fill) => {
    const wrapper = mount(MeterBar, { props: { width: 50, signal, label: 'x' } })

    expect(wrapper.find('[data-slot="meter-fill"]').classes()).toContain(fill)
  })
})
