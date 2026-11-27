import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FigureStrip, { type Figure } from '@/components/dashboards/FigureStrip.vue'

function figures(count: number): Figure[] {
  return Array.from({ length: count }, (_, index) => ({
    key: `f${index}`,
    label: `Label ${index}`,
    note: index === 1 ? 'A note' : undefined,
  }))
}

function render(count: number) {
  const slots = Object.fromEntries(
    figures(count).map((figure) => [`value-${figure.key}`, `Value ${figure.key}`]),
  )
  return mount(FigureStrip, { props: { figures: figures(count) }, slots })
}

describe('FigureStrip', () => {
  it('writes the label, the value from its slot and the note of each figure', () => {
    const wrapper = render(3)

    const cells = wrapper.findAll('[role="listitem"]')
    expect(cells.map((cell) => cell.attributes('data-figure'))).toEqual(['f0', 'f1', 'f2'])
    expect(cells[0]!.text()).toBe('Label 0Value f0')
    expect(cells[1]!.text()).toBe('Label 1Value f1A note')
  })

  it('divides the cells with the border showing through a one pixel gap', () => {
    const grid = render(5).find('[data-slot="figure-strip"]')

    expect(grid.classes()).toEqual(expect.arrayContaining(['bg-border', 'gap-px']))
    expect(render(5).find('[role="listitem"]').classes()).toContain('bg-card')
  })

  it('lays five figures in two columns on the phone, three and two on the tablet and five on the desktop', () => {
    const wrapper = render(5)

    expect(wrapper.find('[data-slot="figure-strip"]').classes()).toEqual(
      expect.arrayContaining(['grid-cols-2', 'md:grid-cols-6', 'lg:grid-cols-5']),
    )
    const cells = wrapper.findAll('[role="listitem"]')
    expect(cells.map((cell) => cell.classes().filter((name) => name.includes('span')))).toEqual([
      ['md:col-span-2', 'lg:col-span-1'],
      ['md:col-span-2', 'lg:col-span-1'],
      ['md:col-span-2', 'lg:col-span-1'],
      ['md:col-span-3', 'lg:col-span-1'],
      ['col-span-2', 'md:col-span-3', 'lg:col-span-1'],
    ])
  })

  it('lays four figures in two columns, four on the desktop', () => {
    expect(render(4).find('[data-slot="figure-strip"]').classes()).toEqual(
      expect.arrayContaining(['grid-cols-2', 'lg:grid-cols-4']),
    )
  })

  it('lays three figures in two columns with the odd one across, three on the tablet', () => {
    const wrapper = render(3)

    expect(wrapper.find('[data-slot="figure-strip"]').classes()).toEqual(
      expect.arrayContaining(['grid-cols-2', 'md:grid-cols-3']),
    )
    expect(wrapper.findAll('[role="listitem"]')[2]!.classes()).toEqual(
      expect.arrayContaining(['col-span-2', 'md:col-span-1']),
    )
  })
})
