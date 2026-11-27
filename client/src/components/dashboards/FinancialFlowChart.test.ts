import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FinancialFlowChart from '@/components/dashboards/FinancialFlowChart.vue'
import { useAppearanceStore } from '@/stores/appearance'
import { createTestPlugins } from '@/test/mounting'
import type { OverviewPeriod } from '@/types'

vi.mock('vue-chartjs', () => ({
  Bar: defineComponent({
    name: 'BarChartStub',
    props: {
      data: { type: Object, default: undefined },
      options: { type: Object, default: undefined },
      plugins: { type: Array, default: undefined },
    },
    setup: () => () => h('canvas'),
  }),
}))

const periods: OverviewPeriod[] = [
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
  '--expense': 'rgb(200, 0, 0)',
  '--border': 'rgb(220, 220, 220)',
  '--muted-foreground': 'rgb(100, 100, 100)',
  '--font-mono': 'IBM Plex Mono',
}

function setTokens(values: Record<string, string>) {
  for (const [token, value] of Object.entries(values)) {
    document.documentElement.style.setProperty(token, value)
  }
}

function render(cut: number | 'all' = 2026) {
  const { plugins } = createTestPlugins({ stubActions: false })
  const wrapper = mount(FinancialFlowChart, { props: { periods, cut }, global: { plugins } })
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

  it('draws the twelve months of the year, with the periods in the month they end', () => {
    const { bar } = render()

    const data = bar().props('data')
    expect(data.labels).toEqual([
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ])
    expect(data.datasets.map((dataset: { label: string }) => dataset.label)).toEqual([
      'Receitas',
      'Despesas',
    ])
    expect(data.datasets[0].data).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 1000, 800, 0, 0])
    expect(data.datasets[1].data).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 400, 300, 0, 0])
  })

  it('takes the colors from the tokens, with the provisional period at 45% of the color', () => {
    const { bar } = render()

    const [revenues, expenses] = bar().props('data').datasets
    expect(revenues.backgroundColor[8]).toBe(tokens['--income'])
    expect(revenues.backgroundColor[9]).toBe('color-mix(in oklch, rgb(0, 128, 0) 45%, transparent)')
    expect(expenses.backgroundColor[8]).toBe(tokens['--expense'])
    expect(expenses.backgroundColor[9]).toBe('color-mix(in oklch, rgb(200, 0, 0) 45%, transparent)')
    expect(revenues.hoverBackgroundColor).toEqual(revenues.backgroundColor)
    expect(revenues.borderColor).toBe(tokens['--income'])
    expect(expenses.borderColor).toBe(tokens['--expense'])
  })

  it('draws a round axis in plain numbers, with the mono font, scaled to the chart width', () => {
    const { bar } = render()

    const { y, x } = bar().props('options').scales
    expect(y.min).toBe(0)
    expect(y.max).toBe(1000)
    expect(y.ticks.stepSize).toBe(250)
    expect(y.ticks.font.family).toBe('IBM Plex Mono')
    expect(y.ticks.callback(1500)).toBe('1.500')
    expect(y.grid.color).toBe(tokens['--border'])
    expect(x.ticks.color).toBe(tokens['--muted-foreground'])
    expect(x.ticks.font.size({ chart: { width: 720 } })).toBe(12)
    expect(y.ticks.font.size({ chart: { width: 720 } })).toBe(11)
    expect(x.ticks.font.size({ chart: { width: 200 } })).toBe(10)
    expect(x.ticks.font.size({ chart: { width: 2000 } })).toBe(16)
  })

  it('marks the empty months for the plugin and names the period in the tooltip', () => {
    const { bar } = render()

    const { plugins } = bar().props('options')
    expect(plugins.flowMarks).toEqual({
      empty: [0, 1, 2, 3, 4, 5, 6, 7, 10, 11],
      provisional: [9],
      color: tokens['--muted-foreground'],
      font: 'IBM Plex Mono',
    })
    expect(plugins.tooltip.callbacks.title([{ dataIndex: 9 }])).toBe('Outubro')
    expect(plugins.tooltip.callbacks.title([{ dataIndex: 0 }])).toBe('Jan')
    expect(plugins.tooltip.callbacks.label({ dataset: { label: 'Receitas' }, raw: 800 })).toMatch(
      /^Receitas: R\$\s*800,00$/,
    )
    expect(plugins.legend.display).toBe(false)
  })

  it('draws one slot per period, named by month and year, for all the periods', () => {
    const { bar } = render('all')

    const { data, options } = { data: bar().props('data'), options: bar().props('options') }
    expect(data.labels).toEqual(['set/26', 'out/26'])
    expect(data.datasets[0].data).toEqual([1000, 800])
    expect(options.plugins.flowMarks.empty).toEqual([])
    expect(options.plugins.flowMarks.provisional).toEqual([1])
    expect(options.plugins.tooltip.callbacks.title([{ dataIndex: 1 }])).toBe('Outubro')
    expect(options.scales.x.ticks.autoSkip).toBe(true)
  })

  it('names only every third period past eighteen and stops skipping labels by itself', () => {
    const many: OverviewPeriod[] = Array.from({ length: 19 }, (_, index) => ({
      financialPeriod: {
        id: `p-${index}`,
        name: `P${index}`,
        startingAt: '2025-01-01',
        endingAt: `${2025 + Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}-28`,
      },
      revenues: 10,
      expenses: 5,
      result: 5,
      recorded: true,
    }))
    const { plugins } = createTestPlugins({ stubActions: false })
    const wrapper = mount(FinancialFlowChart, {
      props: { periods: many, cut: 'all' },
      global: { plugins },
    })

    const bar = wrapper.findComponent({ name: 'BarChartStub' })
    expect(bar.props('data').labels.slice(0, 4)).toEqual(['jan/25', '', '', 'abr/25'])
    expect(bar.props('options').scales.x.ticks.autoSkip).toBe(false)
  })

  it('gives the chart the same height as the result by year chart on wide screens', () => {
    const { wrapper } = render()

    expect(wrapper.find('[role="img"]').classes()).toContain('lg:h-64')
  })

  it('registers the plugin that draws the empty months', () => {
    const { bar } = render()

    expect(bar().props('plugins')).toEqual([expect.objectContaining({ id: 'flowMarks' })])
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
