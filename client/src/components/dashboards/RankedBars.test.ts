import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RankedBars from '@/components/dashboards/RankedBars.vue'
import { createTestPlugins } from '@/test/mounting'
import type { RankRow } from '@/utils/composition'

const rows: RankRow[] = [
  { key: 'a', name: 'Alimentação', value: 600, drill: 'a', share: 0.6, rest: null },
  { key: 'b', name: 'Casa', value: 300, drill: null, share: 0.3, rest: null },
  {
    key: 'rest',
    name: 'Outros 2 centros de custo',
    value: 100,
    drill: null,
    share: 0.1,
    rest: 'X, Y',
  },
]

function render() {
  return mount(RankedBars, { props: { rows }, global: { plugins: createTestPlugins().plugins } })
}

describe('RankedBars', () => {
  it('writes the name, the value and the share of each row with a bar relative to the largest', () => {
    const items = render().findAll('[data-slot="rank-row"]')

    expect(items).toHaveLength(3)
    expect(items[0]!.text()).toContain('Alimentação')
    expect(items[0]!.text()).toContain('600,00')
    expect(items[0]!.find('[data-slot="rank-share"]').text()).toBe('60,0%')
    expect(items[0]!.find('[data-slot="meter-fill"]').attributes('style')).toContain('width: 100%')
    expect(items[1]!.find('[data-slot="meter-fill"]').attributes('style')).toContain('width: 50%')
  })

  it('puts the value and the share in the tooltip, naming the folded rows in the rest one', () => {
    const items = render().findAll('[data-slot="rank-row"]')

    expect(items[0]!.attributes('title')).toMatch(/^Alimentação · R\$\s*600,00 · 60,0%$/)
    expect(items[2]!.attributes('title')).toMatch(/^X, Y · R\$\s*100,00 · 10,0%$/)
    expect(items[2]!.classes()).toContain('text-muted-foreground')
    expect(items[0]!.classes()).not.toContain('text-muted-foreground')
  })

  it('makes a button of the row that drills down and a plain name of the others', async () => {
    const wrapper = render()

    expect(wrapper.findAll('[data-slot="drill"]')).toHaveLength(1)
    expect(wrapper.findAll('[data-slot="rank-name"]')).toHaveLength(2)

    await wrapper.find('[data-slot="drill"]').trigger('click')

    expect(wrapper.emitted('drill')).toEqual([['a']])
  })
})
