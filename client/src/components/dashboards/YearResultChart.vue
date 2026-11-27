<script setup lang="ts">
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
  type TooltipItem,
} from 'chart.js'
import { computed, nextTick, ref, watch } from 'vue'
import { Bar } from 'vue-chartjs'
import { useI18n } from 'vue-i18n'
import { yearMarksPlugin, type YearMark } from '@/components/dashboards/yearMarksPlugin'
import { useAppearanceStore } from '@/stores/appearance'
import type { OverviewYearResult } from '@/types'
import { formatRate, resultScale } from '@/utils/overview'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const plugins = [yearMarksPlugin]

const PROVISIONAL_OPACITY = 45
const MAX_BAR_THICKNESS = 48
const PADDING_TOP = 30
const PADDING_BOTTOM = 52

const props = defineProps<{ years: OverviewYearResult[]; selected: number | null }>()

const { t, n, locale } = useI18n()
const appearance = useAppearanceStore()

function readColors() {
  const styles = getComputedStyle(document.documentElement)
  const read = (token: string) => styles.getPropertyValue(token).trim()
  return {
    positive: read('--chart-1'),
    negative: read('--expense'),
    foreground: read('--foreground'),
    muted: read('--muted-foreground'),
    border: read('--border'),
    mono: read('--font-mono'),
    sans: read('--font-sans'),
  }
}

const colors = ref(readColors())

watch(
  () => appearance.dark,
  async () => {
    await nextTick()
    colors.value = readColors()
  },
)

const integer = computed(() => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 0 }))

function money(value: number) {
  return `${value < 0 ? '−' : ''}${n(Math.abs(value), 'currency')}`
}

function solid(year: OverviewYearResult) {
  return year.result < 0 ? colors.value.negative : colors.value.positive
}

const data = computed<ChartData<'bar'>>(() => {
  const fills = props.years.map((year) =>
    year.provisional
      ? `color-mix(in oklch, ${solid(year)} ${PROVISIONAL_OPACITY}%, transparent)`
      : solid(year),
  )
  return {
    labels: props.years.map((year) => String(year.year)),
    datasets: [
      {
        label: t('overview.year-chart.result'),
        data: props.years.map((year) => year.result),
        backgroundColor: fills,
        hoverBackgroundColor: fills,
        borderColor: props.years.map(solid),
        categoryPercentage: 1,
        barPercentage: 0.5,
        maxBarThickness: MAX_BAR_THICKNESS,
        borderRadius: 2,
        minBarLength: 1,
      },
    ],
  }
})

const marks = computed<YearMark[]>(() =>
  props.years.map((year) => ({
    value: `${year.result < 0 ? '−' : ''}${integer.value.format(Math.abs(year.result))}`,
    year: String(year.year),
    rate: t('overview.year-chart.savings', { rate: formatRate(year.savingsRate, locale.value) }),
    selected: props.selected === null || props.selected === year.year,
    provisional: year.provisional,
    color: solid(year),
  })),
)

const scale = computed(() => resultScale(props.years.map((year) => year.result)))

const options = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: { top: PADDING_TOP, bottom: PADDING_BOTTOM } },
  scales: {
    x: { display: false },
    y: { display: false, min: scale.value.min, max: scale.value.max },
  },
  plugins: {
    legend: { display: false },
    yearMarks: {
      marks: marks.value,
      foreground: colors.value.foreground,
      muted: colors.value.muted,
      border: colors.value.border,
      mono: colors.value.mono,
      sans: colors.value.sans,
    },
    tooltip: {
      callbacks: {
        title: (items: TooltipItem<'bar'>[]) => {
          const year = props.years[items[0]!.dataIndex]!
          return year.provisional
            ? `${year.year} (${t('overview.provisional')})`
            : String(year.year)
        },
        label: (item: TooltipItem<'bar'>) => {
          const year = props.years[item.dataIndex]!
          return [
            `${t('overview.year-chart.result')}: ${money(year.result)}`,
            `${t('overview.figures.savings-rate')}: ${formatRate(year.savingsRate, locale.value)}`,
          ]
        },
      },
    },
  },
}))
</script>

<template>
  <div class="grid gap-3" data-slot="year-result-chart">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-base font-semibold">{{ $t('overview.year-chart.title') }}</h2>
    </div>
    <div
      class="aspect-[360/256] w-full min-w-0 lg:aspect-auto lg:h-64"
      role="img"
      :aria-label="$t('overview.year-chart.title')"
    >
      <Bar :data="data" :options="options" :plugins="plugins" />
    </div>
  </div>
</template>
