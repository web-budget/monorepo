import type { Chart } from 'chart.js'
import { describe, expect, it, vi } from 'vitest'
import {
  emptyMonthsPlugin,
  type EmptyMonthsOptions,
} from '@/components/dashboards/emptyMonthsPlugin'

type Draw = (chart: Chart<'bar'>, args: object, options: EmptyMonthsOptions) => void

describe('emptyMonthsPlugin', () => {
  it('writes a dash on the baseline of each empty month', () => {
    const ctx = {
      save: vi.fn<() => void>(),
      restore: vi.fn<() => void>(),
      fillText: vi.fn<(text: string, x: number, y: number) => void>(),
      fillStyle: '',
      font: '',
      textAlign: '',
    }
    const chart = {
      ctx,
      scales: {
        x: { getPixelForValue: (index: number) => 10 + index * 20 },
        y: { getPixelForValue: () => 100 },
      },
    } as unknown as Chart<'bar'>

    ;(emptyMonthsPlugin.afterDatasetsDraw as unknown as Draw)(
      chart,
      {},
      { indexes: [0, 3], color: 'gray', font: 'IBM Plex Mono' },
    )

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
})
