import type { Chart, Plugin } from 'chart.js'

export interface EmptyMonthsOptions {
  indexes: number[]
  color: string
  font: string
}

declare module 'chart.js' {
  interface PluginOptionsByType<TType> {
    emptyMonths?: TType extends 'bar' ? EmptyMonthsOptions : never
  }
}

/** Draws a dash on the baseline of the months that have no movement, as the design does. */
export const emptyMonthsPlugin: Plugin<'bar'> = {
  id: 'emptyMonths',
  afterDatasetsDraw(chart: Chart<'bar'>, _args, options: EmptyMonthsOptions) {
    const { ctx, scales } = chart
    const baseline = scales.y!.getPixelForValue(0) - 6
    ctx.save()
    ctx.fillStyle = options.color
    ctx.font = `10.5px ${options.font}`
    ctx.textAlign = 'center'
    for (const index of options.indexes) {
      ctx.fillText('—', scales.x!.getPixelForValue(index), baseline)
    }
    ctx.restore()
  },
}
