import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import YearResultChart from '@/components/dashboards/YearResultChart.vue'
import { useAppearanceStore } from '@/stores/appearance'
import { createTestPlugins } from '@/test/mounting'
import type { OverviewYearResult } from '@/types'

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

const years: OverviewYearResult[] = [
  {
    year: 2024,
    revenues: 1000,
    expenses: 1200,
    result: -200,
    savingsRate: -0.2,
    provisional: false,
  },
  {
    year: 2025,
    revenues: 2000,
    expenses: 1500,
    result: 500,
    savingsRate: 0.25,
    provisional: false,
  },
  { year: 2026, revenues: 0, expenses: 0, result: 1250.4, savingsRate: null, provisional: true },
]

const tokens: Record<string, string> = {
  '--chart-1': 'rgb(0, 100, 0)',
  '--expense': 'rgb(200, 0, 0)',
  '--foreground': 'rgb(10, 10, 10)',
  '--muted-foreground': 'rgb(100, 100, 100)',
  '--border': 'rgb(220, 220, 220)',
  '--font-mono': 'IBM Plex Mono',
  '--font-sans': 'IBM Plex Sans',
}

function setTokens(values: Record<string, string>) {
  for (const [token, value] of Object.entries(values)) {
    document.documentElement.style.setProperty(token, value)
  }
}

function render(selected: number | null = 2026) {
  const { plugins } = createTestPlugins({ stubActions: false })
  const wrapper = mount(YearResultChart, { props: { years, selected }, global: { plugins } })
  const bar = () => wrapper.findComponent({ name: 'BarChartStub' })
  return { wrapper, bar }
}

describe('YearResultChart', () => {
  beforeEach(() => {
    setTokens(tokens)
  })

  afterEach(() => {
    document.documentElement.removeAttribute('style')
  })

  it('draws one bar per year on a single axis, red when negative, faded when provisional', () => {
    const { bar } = render()

    const data = bar().props('data')
    expect(data.labels).toEqual(['2024', '2025', '2026'])
    expect(data.datasets).toHaveLength(1)
    const [dataset] = data.datasets
    expect(dataset.data).toEqual([-200, 500, 1250.4])
    expect(dataset.backgroundColor).toEqual([
      tokens['--expense'],
      tokens['--chart-1'],
      'color-mix(in oklch, rgb(0, 100, 0) 45%, transparent)',
    ])
    expect(dataset.hoverBackgroundColor).toEqual(dataset.backgroundColor)
    expect(dataset.borderColor).toEqual([
      tokens['--expense'],
      tokens['--chart-1'],
      tokens['--chart-1'],
    ])
    const { scales } = bar().props('options')
    expect(scales.x.display).toBe(false)
    expect(scales.y.display).toBe(false)
    expect(scales.y.min).toBeCloseTo(-200 - 1450.4 * 0.14)
    expect(scales.y.max).toBe(1250.4)
    expect(Object.keys(scales)).toEqual(['x', 'y'])
  })

  it('hands the plugin the labels: the result, the year, the savings rate and the outline', () => {
    const { bar } = render(2025)

    expect(bar().props('plugins')).toEqual([expect.objectContaining({ id: 'yearMarks' })])
    const { yearMarks } = bar().props('options').plugins
    expect(yearMarks).toMatchObject({
      foreground: tokens['--foreground'],
      muted: tokens['--muted-foreground'],
      border: tokens['--border'],
      mono: 'IBM Plex Mono',
      sans: 'IBM Plex Sans',
    })
    expect(yearMarks.marks).toEqual([
      {
        value: '−200',
        year: '2024',
        rate: 'poupança −20,0%',
        selected: false,
        provisional: false,
        color: tokens['--expense'],
      },
      {
        value: '500',
        year: '2025',
        rate: 'poupança 25,0%',
        selected: true,
        provisional: false,
        color: tokens['--chart-1'],
      },
      {
        value: '1.250',
        year: '2026',
        rate: 'poupança —',
        selected: false,
        provisional: true,
        color: tokens['--chart-1'],
      },
    ])
  })

  it('selects every year when all the periods are on screen', () => {
    const { bar } = render(null)

    const { marks } = bar().props('options').plugins.yearMarks
    expect(marks.map((mark: { selected: boolean }) => mark.selected)).toEqual([true, true, true])
  })

  it('names the year, the result and the rate in the tooltip, signing only the negative', () => {
    const { bar } = render()

    const { callbacks } = bar().props('options').plugins.tooltip
    expect(callbacks.title([{ dataIndex: 0 }])).toBe('2024')
    expect(callbacks.title([{ dataIndex: 2 }])).toBe('2026 (provisório)')
    expect(callbacks.label({ dataIndex: 0 })).toEqual([
      expect.stringMatching(/^Resultado: −R\$\s*200,00$/),
      'Taxa de poupança: −20,0%',
    ])
    expect(callbacks.label({ dataIndex: 1 })).toEqual([
      expect.stringMatching(/^Resultado: R\$\s*500,00$/),
      'Taxa de poupança: 25,0%',
    ])
    expect(bar().props('options').plugins.legend.display).toBe(false)
  })

  it('leaves room around the plot for the labels and gives the card its title and a fixed wide height', () => {
    const { wrapper, bar } = render()

    expect(bar().props('options').layout.padding).toEqual({ top: 30, bottom: 52 })
    expect(wrapper.find('h2').text()).toBe('Resultado por ano')
    expect(wrapper.find('[role="img"]').attributes('aria-label')).toBe('Resultado por ano')
    expect(wrapper.find('[role="img"]').classes()).toContain('lg:h-64')
  })

  it('reads the colors again when the theme changes', async () => {
    const { bar } = render()
    setTokens({ '--chart-1': 'rgb(1, 2, 3)' })

    useAppearanceStore().setMode('dark')
    await flushPromises()

    expect(bar().props('data').datasets[0].borderColor[1]).toBe('rgb(1, 2, 3)')
  })
})
