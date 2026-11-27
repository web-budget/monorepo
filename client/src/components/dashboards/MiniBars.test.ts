import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MiniBars from '@/components/dashboards/MiniBars.vue'
import { createTestPlugins } from '@/test/mounting'

function render(values: number[]) {
  return mount(MiniBars, {
    props: {
      bars: values.map((value, index) => ({ label: `P${index + 1}`, value })),
      description: 'Visa ••9101',
    },
    global: { plugins: createTestPlugins().plugins },
  })
}

describe('MiniBars', () => {
  it('scales the bars to the largest, with a tooltip each and the last one highlighted', () => {
    const wrapper = render([50, 100, 0])

    const bars = wrapper.findAll('[data-slot="mini-bar"]')
    expect(bars.map((bar) => bar.attributes('style'))).toEqual([
      'height: 50%;',
      'height: 100%;',
      'height: 8%;',
    ])
    expect(bars[1]!.attributes('title')).toMatch(/^P2 · R\$\s*100,00$/)
    expect(bars[2]!.classes()).toContain('bg-chart-1')
    expect(bars[0]!.classes()).not.toContain('bg-chart-1')
    expect(bars[2]!.classes()).toContain('opacity-40')
    expect(bars[0]!.classes()).not.toContain('opacity-40')
    expect(wrapper.find('[role="img"]').attributes('aria-label')).toBe('Visa ••9101')
  })

  it('keeps a minimum height when every value is zero', () => {
    const wrapper = render([0, 0])

    expect(wrapper.findAll('[data-slot="mini-bar"]').map((bar) => bar.attributes('style'))).toEqual(
      ['height: 8%;', 'height: 8%;'],
    )
  })
})
