import type { Chart } from 'chart.js'
import { describe, expect, it, vi } from 'vitest'
import {
  yearMarksPlugin,
  type YearMark,
  type YearMarksOptions,
} from '@/components/dashboards/yearMarksPlugin'

type Draw = (chart: Chart<'bar'>, args: object, options: YearMarksOptions) => void

function bar(x: number, y: number, base: number, width: number) {
  return { getProps: () => ({ x, y, base, width }) }
}

function mark(overrides: Partial<YearMark>): YearMark {
  return {
    value: '1.000',
    year: '2025',
    rate: 'poupança 10,0%',
    selected: false,
    provisional: false,
    color: 'green',
    ...overrides,
  }
}

function render(marks: YearMark[], chartWidth = 360) {
  const fonts: string[] = []
  const ctx = {
    save: vi.fn<() => void>(),
    restore: vi.fn<() => void>(),
    beginPath: vi.fn<() => void>(),
    moveTo: vi.fn<(x: number, y: number) => void>(),
    lineTo: vi.fn<(x: number, y: number) => void>(),
    stroke: vi.fn<() => void>(),
    fillText: vi.fn<(text: string, x: number, y: number) => void>(),
    setLineDash: vi.fn<(segments: number[]) => void>(),
    strokeRect: vi.fn<(x: number, y: number, width: number, height: number) => void>(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    textAlign: '',
    set font(value: string) {
      fonts.push(value)
    },
  }
  const bars = [bar(60, 40, 120, 40), bar(160, 150, 120, 40), bar(260, 120, 120, 40)]
  const chart = {
    ctx,
    width: chartWidth,
    chartArea: { left: 10, right: 350, bottom: 180 },
    scales: { y: { getPixelForValue: () => 120 } },
    getDatasetMeta: () => ({ data: bars }),
  } as unknown as Chart<'bar'>
  ;(yearMarksPlugin.afterDatasetsDraw as unknown as Draw)(
    chart,
    {},
    {
      marks,
      foreground: 'black',
      muted: 'gray',
      border: 'silver',
      mono: 'IBM Plex Mono',
      sans: 'IBM Plex Sans',
    },
  )
  return { ctx, fonts }
}

describe('yearMarksPlugin', () => {
  it('draws the baseline across the chart area', () => {
    const { ctx } = render([mark({})])

    expect(ctx.moveTo).toHaveBeenCalledWith(10, 120)
    expect(ctx.lineTo).toHaveBeenCalledWith(350, 120)
    expect(ctx.stroke).toHaveBeenCalledOnce()
    expect(ctx.save).toHaveBeenCalledOnce()
    expect(ctx.restore).toHaveBeenCalledOnce()
    expect(ctx.textAlign).toBe('center')
  })

  it('writes the value above a positive bar, the year and the rate under the baseline', () => {
    const { ctx, fonts } = render([mark({})])

    expect(ctx.fillText.mock.calls).toEqual([
      ['1.000', 60, 32],
      ['2025', 60, 202],
      ['poupança 10,0%', 60, 220],
    ])
    expect(fonts).toEqual(['12px IBM Plex Mono', '400 13px IBM Plex Sans', '12px IBM Plex Mono'])
  })

  it('writes the value under a negative bar and the selected year in bold', () => {
    const { ctx, fonts } = render([mark({}), mark({ value: '−300', selected: true })])

    expect(ctx.fillText.mock.calls[3]).toEqual(['−300', 160, 165])
    expect(fonts[4]).toBe('600 13px IBM Plex Sans')
  })

  it('scales the fonts with the chart width, between 10 and 16px', () => {
    expect(render([mark({})], 100).fonts[0]).toBe('10px IBM Plex Mono')
    expect(render([mark({})], 1000).fonts[0]).toBe('16px IBM Plex Mono')
  })

  it('outlines the provisional bar with a dashed line in its own color', () => {
    const { ctx } = render([mark({ provisional: true, color: 'tomato' })])

    expect(ctx.setLineDash).toHaveBeenCalledWith([3, 2])
    expect(ctx.strokeStyle).toBe('tomato')
    expect(ctx.strokeRect).toHaveBeenCalledWith(40.5, 40.5, 39, 79)
  })

  it('draws no outline for a year that is not provisional or whose bar has no height', () => {
    const { ctx } = render([mark({}), mark({}), mark({ provisional: true })])

    expect(ctx.strokeRect).not.toHaveBeenCalled()
  })
})
