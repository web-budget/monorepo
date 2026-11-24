import type { BarElement, Chart, Plugin } from 'chart.js'

export interface FlowMarksOptions {
  empty: number[]
  provisional: number[]
  color: string
  font: string
}

declare module 'chart.js' {
  interface PluginOptionsByType<TType> {
    flowMarks?: TType extends 'bar' ? FlowMarksOptions : never
  }
}

const OUTLINE_DASH = [3, 2]
const MINIMUM_BAR_HEIGHT = 1

/**
 * Draws what the design has and Chart.js does not: a dash on the baseline of the months without
 * movement and a dashed outline on the bars of the provisional (open) periods.
 */
export const flowMarksPlugin: Plugin<'bar'> = {
  id: 'flowMarks',
  afterDatasetsDraw(chart: Chart<'bar'>, _args, options: FlowMarksOptions) {
    const { ctx, scales } = chart
    ctx.save()
    ctx.fillStyle = options.color
    ctx.font = `10.5px ${options.font}`
    ctx.textAlign = 'center'
    const baseline = scales.y!.getPixelForValue(0) - 6
    for (const index of options.empty) {
      ctx.fillText('—', scales.x!.getPixelForValue(index), baseline)
    }
    ctx.setLineDash(OUTLINE_DASH)
    ctx.lineWidth = 1
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      ctx.strokeStyle = String(dataset.borderColor)
      const bars = chart.getDatasetMeta(datasetIndex).data as BarElement[]
      for (const index of options.provisional) {
        const { x, y, base, width } = bars[index]!.getProps(
          ['x', 'y', 'base', 'width'],
          true,
        ) as Record<'x' | 'y' | 'base' | 'width', number>
        if (base - y >= MINIMUM_BAR_HEIGHT) {
          ctx.strokeRect(x - width / 2 + 0.5, y + 0.5, width - 1, base - y - 1)
        }
      }
    })
    ctx.restore()
  },
}
