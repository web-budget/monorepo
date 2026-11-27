import type { BarElement, Chart, Plugin } from 'chart.js'

export interface YearMark {
  value: string
  year: string
  rate: string
  selected: boolean
  provisional: boolean
  color: string
}

export interface YearMarksOptions {
  marks: YearMark[]
  foreground: string
  muted: string
  border: string
  mono: string
  sans: string
}

declare module 'chart.js' {
  interface PluginOptionsByType<TType> {
    yearMarks?: TType extends 'bar' ? YearMarksOptions : never
  }
}

const DESIGN_WIDTH = 360
const MIN_FONT_SIZE = 10
const MAX_FONT_SIZE = 16
const OUTLINE_DASH = [3, 2]
const MINIMUM_BAR_HEIGHT = 1
const VALUE_GAP_ABOVE = 8
const VALUE_GAP_BELOW = 15
const YEAR_OFFSET = 22
const RATE_OFFSET = 40

function fontSize(chart: Chart<'bar'>, size: number) {
  return Math.min(
    MAX_FONT_SIZE,
    Math.max(MIN_FONT_SIZE, Math.round((size * chart.width) / DESIGN_WIDTH)),
  )
}

/**
 * Draws what the design has and Chart.js does not: the baseline, the result above (or under, when
 * negative) each bar, the year with the savings rate under it, and the dashed outline of the
 * provisional year. The rate is a label, never a second axis.
 */
export const yearMarksPlugin: Plugin<'bar'> = {
  id: 'yearMarks',
  afterDatasetsDraw(chart: Chart<'bar'>, _args, options: YearMarksOptions) {
    const { ctx, chartArea, scales } = chart
    ctx.save()
    ctx.strokeStyle = options.border
    ctx.lineWidth = 1
    const baseline = scales.y!.getPixelForValue(0)
    ctx.beginPath()
    ctx.moveTo(chartArea.left, baseline)
    ctx.lineTo(chartArea.right, baseline)
    ctx.stroke()
    ctx.textAlign = 'center'
    const bars = chart.getDatasetMeta(0).data as BarElement[]
    options.marks.forEach((mark, index) => {
      const { x, y, base, width } = bars[index]!.getProps(
        ['x', 'y', 'base', 'width'],
        true,
      ) as Record<'x' | 'y' | 'base' | 'width', number>
      const top = Math.min(y, base)
      const bottom = Math.max(y, base)
      ctx.fillStyle = options.foreground
      ctx.font = `${fontSize(chart, 11.5)}px ${options.mono}`
      ctx.fillText(mark.value, x, y > base ? bottom + VALUE_GAP_BELOW : top - VALUE_GAP_ABOVE)
      ctx.font = `${mark.selected ? 600 : 400} ${fontSize(chart, 12.5)}px ${options.sans}`
      ctx.fillText(mark.year, x, chartArea.bottom + YEAR_OFFSET)
      ctx.fillStyle = options.muted
      ctx.font = `${fontSize(chart, 11.5)}px ${options.mono}`
      ctx.fillText(mark.rate, x, chartArea.bottom + RATE_OFFSET)
      if (mark.provisional && bottom - top >= MINIMUM_BAR_HEIGHT) {
        ctx.setLineDash(OUTLINE_DASH)
        ctx.strokeStyle = mark.color
        ctx.strokeRect(x - width / 2 + 0.5, top + 0.5, width - 1, bottom - top - 1)
      }
    })
    ctx.restore()
  },
}
