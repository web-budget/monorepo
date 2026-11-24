import type { Chart } from 'chart.js'
import { describe, expect, it, vi } from 'vitest'
import { flowMarksPlugin, type FlowMarksOptions } from '@/components/dashboards/flowMarksPlugin'

type Draw = (chart: Chart<'bar'>, args: object, options: FlowMarksOptions) => void

function bar(x: number, y: number, base: number, width: number) {
  return { getProps: () => ({ x, y, base, width }) }
}

function render(provisional: number[]) {
  const ctx = {
    save: vi.fn<() => void>(),
    restore: vi.fn<() => void>(),
    fillText: vi.fn<(text: string, x: number, y: number) => void>(),
    setLineDash: vi.fn<(segments: number[]) => void>(),
    strokeRect: vi.fn<(x: number, y: number, width: number, height: number) => void>(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
  }
  const bars = [
    [bar(30, 60, 100, 16), bar(70, 100, 100, 16)],
    [bar(50, 40, 100, 16), bar(90, 70, 100, 16)],
  ]
  const chart = {
    ctx,
    scales: {
      x: { getPixelForValue: (index: number) => 10 + index * 20 },
      y: { getPixelForValue: () => 100 },
    },
    data: { datasets: [{ borderColor: 'green' }, { borderColor: 'red' }] },
    getDatasetMeta: (datasetIndex: number) => ({ data: bars[datasetIndex] }),
  } as unknown as Chart<'bar'>
  ;(flowMarksPlugin.afterDatasetsDraw as unknown as Draw)(
    chart,
    {},
    { empty: [0, 3], provisional, color: 'gray', font: 'IBM Plex Mono' },
  )
  return ctx
}

describe('flowMarksPlugin', () => {
  it('writes a dash on the baseline of each empty month', () => {
    const ctx = render([])

    expect(ctx.fillText.mock.calls).toEqual([
      ['—', 10, 94],
      ['—', 70, 94],
    ])
    expect(ctx.fillStyle).toBe('gray')
    expect(ctx.font).toBe('10.5px IBM Plex Mono')
    expect(ctx.textAlign).toBe('center')
    expect(ctx.save).toHaveBeenCalledOnce()
    expect(ctx.restore).toHaveBeenCalledOnce()
  })

  it('outlines the provisional bars with a dashed line', () => {
    const ctx = render([0, 1])

    expect(ctx.setLineDash).toHaveBeenCalledWith([3, 2])
    expect(ctx.strokeRect.mock.calls).toEqual([
      [22.5, 60.5, 15, 39],
      [42.5, 40.5, 15, 59],
      [82.5, 70.5, 15, 29],
    ])
    expect(ctx.strokeStyle).toBe('red')
  })

  it('skips the provisional bar that has no height', () => {
    const ctx = render([1])

    expect(ctx.strokeRect.mock.calls).toEqual([[82.5, 70.5, 15, 29]])
  })

  it('draws no outline when nothing is provisional', () => {
    const ctx = render([])

    expect(ctx.strokeRect).not.toHaveBeenCalled()
  })
})
