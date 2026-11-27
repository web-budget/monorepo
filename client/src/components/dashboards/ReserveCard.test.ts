import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ReserveCard from '@/components/dashboards/ReserveCard.vue'
import { createTestPlugins } from '@/test/mounting'
import type { OverviewCostOfLiving, OverviewReserve } from '@/types'

interface Props {
  accumulated?: number
  costOfLiving?: OverviewCostOfLiving
  reserve?: OverviewReserve
  untilToday?: boolean
}

function render(props: Props = {}) {
  const { plugins } = createTestPlugins()
  return mount(ReserveCard, {
    props: {
      accumulated: 5000,
      costOfLiving: { value: 2000, basedOn: 12 },
      reserve: { current: 6000, months: 6, ideal: 12000 },
      untilToday: false,
      ...props,
    },
    global: { plugins },
  })
}

describe('ReserveCard', () => {
  it('shows the four figures, with the months of the ideal reserve in its note', () => {
    const wrapper = render()

    expect(wrapper.find('h2').text()).toBe('Reserva e custo de vida')
    const figures = wrapper.findAll('[data-figure]')
    expect(figures.map((figure) => figure.attributes('data-figure'))).toEqual([
      'accumulated',
      'cost-of-living',
      'reserve-current',
      'reserve-ideal',
    ])
    expect(figures[0]!.text()).toMatch(/^Acumulado\s*R\$\s*5\.000,00$/)
    expect(figures[1]!.text()).toMatch(/^Custo de vida\s*R\$\s*2\.000,00Por período$/)
    expect(figures[2]!.text()).toMatch(/^Reserva atual\s*R\$\s*6\.000,00$/)
    expect(figures[3]!.text()).toMatch(
      /^Reserva ideal\s*R\$\s*12\.000,00\s*6 meses de custo de vida$/,
    )
  })

  it('writes the singular month for an ideal reserve of one month', () => {
    const wrapper = render({ reserve: { current: 100, months: 1, ideal: 2000 } })

    expect(wrapper.find('[data-figure="reserve-ideal"]').text()).toContain('1 mês de custo de vida')
  })

  it('says how many periods the cost of living is based on when there are fewer than twelve', () => {
    expect(render({ costOfLiving: { value: 2000, basedOn: 7 } }).text()).toContain(
      'Por período · baseado em 7 períodos',
    )
    expect(render({ costOfLiving: { value: 2000, basedOn: 1 } }).text()).toContain(
      'Por período · baseado em 1 período',
    )
  })

  it('shows a dash and says there is no closed period, with three columns and no ideal reserve', () => {
    const wrapper = render({
      costOfLiving: { value: null, basedOn: 0 },
      reserve: { current: 6000, months: 6, ideal: null },
    })

    const figures = wrapper.findAll('[data-figure]')
    expect(figures).toHaveLength(3)
    expect(figures[1]!.text()).toBe('Custo de vida—Sem período encerrado')
    expect(wrapper.find('[data-slot="reserve-progress"]').exists()).toBe(false)
    expect(wrapper.find('[data-slot="figure-strip"]').classes()).toContain('md:grid-cols-3')
  })

  it('shows how much of the ideal reserve is there and how much is missing', () => {
    const wrapper = render({ reserve: { current: 8000, months: 6, ideal: 12000 } })

    const progress = wrapper.find('[data-slot="reserve-progress"]')
    expect(progress.text()).toMatch(/^Reserva atual em 67% da ideal\s*Faltam\s*R\$\s*4\.000,00$/)
    expect(progress.find('[data-slot="covered"]').exists()).toBe(false)
    const meter = progress.find('[data-slot="meter"]')
    expect(meter.attributes('aria-label')).toBe('Reserva atual em 67% da ideal')
    expect(meter.find('[data-slot="meter-fill"]').attributes('style')).toContain('width: 66.6')
  })

  it('shows the covered seal and a full bar when the current reserve reaches the ideal one', () => {
    const wrapper = render({ reserve: { current: 18000, months: 6, ideal: 12000 } })

    const progress = wrapper.find('[data-slot="reserve-progress"]')
    expect(progress.text()).toMatch(/^Reserva atual em 150% da ideal\s*Coberta$/)
    expect(progress.text()).not.toContain('Faltam')
    expect(progress.find('[data-slot="meter-fill"]').attributes('style')).toContain('width: 100%')
  })

  it('counts an ideal reserve of zero as covered', () => {
    const wrapper = render({
      costOfLiving: { value: 0, basedOn: 3 },
      reserve: { current: 0, months: 6, ideal: 0 },
    })

    expect(wrapper.find('[data-slot="reserve-progress"]').text()).toMatch(/100%.*Coberta/)
  })

  it('signs a negative accumulated in red and nothing else', () => {
    const wrapper = render({ accumulated: -300 })

    const accumulated = wrapper.find('[data-figure="accumulated"] [data-slot="currency"]')
    expect(accumulated.text()).toMatch(/^−R\$\s*300,00$/)
    expect(accumulated.classes()).toContain('text-expense')
    expect(wrapper.find('[data-figure="reserve-current"]').text()).not.toContain('−')
  })

  it('shows the until today seal only when asked to', () => {
    expect(render().find('[data-slot="until-today"]').exists()).toBe(false)
    expect(render({ untilToday: true }).find('[data-slot="until-today"]').text()).toBe('até hoje')
  })
})
