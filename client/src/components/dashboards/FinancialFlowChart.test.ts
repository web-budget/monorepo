import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FinancialFlowChart from '@/components/dashboards/FinancialFlowChart.vue'
import { useAppearanceStore } from '@/stores/appearance'
import { createTestPlugins } from '@/test/mounting'
import type { FinancialFlowPeriod } from '@/types'

vi.mock('vue-chartjs', () => ({
  Bar: defineComponent({
    name: 'BarChartStub',
    props: {
      data: { type: Object, default: undefined },
      options: { type: Object, default: undefined },
    },
    setup: () => () => h('canvas'),
  }),
}))

const periods: FinancialFlowPeriod[] = [
  {
    financialPeriod: {
      id: 'p-9',
      name: 'Setembro',
      startingAt: '2026-09-01',
      endingAt: '2026-09-30',
    },
    revenues: 1000,
    expenses: 400,
    result: 600,
    recorded: true,
  },
  {
    financialPeriod: {
      id: 'p-10',
      name: 'Outubro',
      startingAt: '2026-10-01',
      endingAt: '2026-10-31',
    },
    revenues: 800,
    expenses: 300,
    result: 500,
    recorded: false,
  },
]

const tokens: Record<string, string> = {
  '--income': 'rgb(0, 128, 0)',
  '--income-muted': 'rgb(200, 240, 200)',
  '--expense': 'rgb(200, 0, 0)',
  '--expense-muted': 'rgb(250, 220, 220)',
  '--border': 'rgb(220, 220, 220)',
  '--muted-foreground': 'rgb(100, 100, 100)',
  '--font-mono': 'IBM Plex Mono',
}

function setTokens(values: Record<string, string>) {
  for (const [token, value] of Object.entries(values)) {
    document.documentElement.style.setProperty(token, value)
  }
}

function render() {
  const { plugins } = createTestPlugins({ stubActions: false })
  const wrapper = mount(FinancialFlowChart, { props: { periods }, global: { plugins } })
  const bar = () => wrapper.findComponent({ name: 'BarChartStub' })
  return { wrapper, bar }
}

describe('FinancialFlowChart', () => {
  beforeEach(() => {
    setTokens(tokens)
  })

  afterEach(() => {
    document.documentElement.removeAttribute('style')
  })

  it('draws a revenue and an expense bar for each period, labelled by the month', () => {
    const { bar } = render()

    const data = bar().props('data')
    expect(data.labels).toHaveLength(2)
    expect(data.labels[0]).toMatch(/set/i)
    expect(data.labels[1]).toMatch(/out/i)
    expect(data.datasets.map((dataset: { label: string }) => dataset.label)).toEqual([
      'Receitas',
      'Despesas',
    ])
    expect(data.datasets[0].data).toEqual([1000, 800])
    expect(data.datasets[1].data).toEqual([400, 300])
  })

  it('takes the colors from the tokens, with the provisional period lighter and dashed', () => {
    const { bar } = render()

    const [revenues, expenses] = bar().props('data').datasets
    expect(revenues.backgroundColor).toEqual([tokens['--income'], tokens['--income-muted']])
    expect(expenses.backgroundColor).toEqual([tokens['--expense'], tokens['--expense-muted']])
    expect(revenues.borderColor).toBe(tokens['--income'])
    expect(expenses.borderColor).toBe(tokens['--expense'])
    expect(revenues.borderWidth).toEqual([0, 1.5])
    expect(revenues.borderDash).toEqual([4, 3])
  })

  it('formats the axis in money with the mono font and names the period in the tooltip', () => {
    const { bar } = render()

    const options = bar().props('options')
    expect(options.scales.y.ticks.font.family).toBe('IBM Plex Mono')
    expect(options.scales.y.grid.color).toBe(tokens['--border'])
    expect(options.scales.x.ticks.color).toBe(tokens['--muted-foreground'])
    expect(options.scales.y.ticks.callback(1500)).toMatch(/R\$\s*1\.500,00/)
    const { callbacks } = options.plugins.tooltip
    expect(callbacks.title([{ dataIndex: 1 }])).toBe('Outubro')
    expect(callbacks.label({ dataset: { label: 'Receitas' }, raw: 800 })).toMatch(
      /^Receitas: R\$\s*800,00$/,
    )
    expect(options.plugins.legend.display).toBe(false)
  })

  it('explains the three kinds of bar in its own legend', () => {
    const { wrapper } = render()

    expect(wrapper.find('[data-slot="chart-legend"]').text()).toBe(
      'ReceitasDespesas Provisório (período aberto)',
    )
    expect(wrapper.find('[role="img"]').attributes('aria-label')).toBe(
      'Receitas e despesas por período',
    )
  })

  it('reads the colors again when the theme changes', async () => {
    const { bar } = render()
    setTokens({ '--income': 'rgb(1, 2, 3)' })

    useAppearanceStore().setMode('dark')
    await flushPromises()

    expect(bar().props('data').datasets[0].borderColor).toBe('rgb(1, 2, 3)')
  })
})
