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
import { flowMarksPlugin } from '@/components/dashboards/flowMarksPlugin'
import { useAppearanceStore } from '@/stores/appearance'
import type { OverviewPeriod } from '@/types'
import { axisScale, flowPeriods } from '@/utils/overview'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const plugins = [flowMarksPlugin]

const DESIGN_WIDTH = 720
const PROVISIONAL_OPACITY = 45
const MIN_FONT_SIZE = 10
const MAX_FONT_SIZE = 16

const props = defineProps<{ periods: OverviewPeriod[] }>()

const { t, n, locale } = useI18n()
const appearance = useAppearanceStore()

function readColors() {
  const styles = getComputedStyle(document.documentElement)
  const read = (token: string) => styles.getPropertyValue(token).trim()
  return {
    income: read('--income'),
    expense: read('--expense'),
    border: read('--border'),
    text: read('--muted-foreground'),
    mono: read('--font-mono'),
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

const slots = computed(() => flowPeriods(props.periods, locale.value))

const withoutMovement = computed(() => slots.value.every((slot) => slot.empty))

const axis = computed(() =>
  axisScale(Math.max(...slots.value.flatMap((slot) => [slot.revenues, slot.expenses]))),
)

const integer = computed(() => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 0 }))

function fills(color: string) {
  return slots.value.map((slot) =>
    slot.recorded ? color : `color-mix(in oklch, ${color} ${PROVISIONAL_OPACITY}%, transparent)`,
  )
}

const data = computed<ChartData<'bar'>>(() => ({
  labels: slots.value.map((slot) => slot.label),
  datasets: [
    {
      label: t('overview.legend.revenues'),
      data: slots.value.map((slot) => slot.revenues),
      backgroundColor: fills(colors.value.income),
      hoverBackgroundColor: fills(colors.value.income),
      borderColor: colors.value.income,
      categoryPercentage: 0.64,
      barPercentage: 0.96,
    },
    {
      label: t('overview.legend.expenses'),
      data: slots.value.map((slot) => slot.expenses),
      backgroundColor: fills(colors.value.expense),
      hoverBackgroundColor: fills(colors.value.expense),
      borderColor: colors.value.expense,
      categoryPercentage: 0.64,
      barPercentage: 0.96,
    },
  ],
}))

function scaledFont(size: number) {
  return {
    size: (context: { chart: { width: number } }) =>
      Math.min(
        MAX_FONT_SIZE,
        Math.max(MIN_FONT_SIZE, Math.round((size * context.chart.width) / DESIGN_WIDTH)),
      ),
  }
}

const options = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: colors.value.text,
        font: scaledFont(12),
        maxRotation: 0,
        autoSkip: !slots.value.some((slot) => slot.label === ''),
      },
    },
    y: {
      display: !withoutMovement.value,
      min: 0,
      max: withoutMovement.value ? 1 : axis.value.max,
      grid: { color: colors.value.border },
      ticks: {
        color: colors.value.text,
        font: { ...scaledFont(11), family: colors.value.mono },
        stepSize: axis.value.step,
        callback: (value) => integer.value.format(Number(value)),
      },
    },
  },
  plugins: {
    legend: { display: false },
    flowMarks: {
      empty: slots.value.flatMap((slot, index) => (slot.empty ? [index] : [])),
      provisional: slots.value.flatMap((slot, index) =>
        slot.recorded || slot.empty ? [] : [index],
      ),
      color: colors.value.text,
      font: colors.value.mono,
    },
    tooltip: {
      callbacks: {
        title: (items: TooltipItem<'bar'>[]) => {
          const slot = slots.value[items[0]!.dataIndex]!
          return [...slot.periodNames, slot.range]
        },
        label: (item: TooltipItem<'bar'>) =>
          `${item.dataset.label}: ${n(Number(item.raw), 'currency')}`,
      },
    },
  },
}))
</script>

<template>
  <div class="grid gap-3" data-slot="financial-flow-chart">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-base font-semibold">{{ $t('overview.chart.title') }}</h2>
      <ul
        class="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs"
        data-slot="chart-legend"
      >
        <li class="inline-flex items-center gap-1.5">
          <span class="bg-income size-2.5 rounded-[1px]" />{{ $t('overview.legend.revenues') }}
        </li>
        <li class="inline-flex items-center gap-1.5">
          <span class="bg-expense size-2.5 rounded-[1px]" />{{ $t('overview.legend.expenses') }}
        </li>
        <li class="inline-flex items-center gap-1.5">
          <span class="border-muted-foreground size-2.5 rounded-[1px] border border-dashed" />
          {{ $t('overview.legend.provisional') }}
        </li>
      </ul>
    </div>
    <div
      class="aspect-[720/256] w-full min-w-0 lg:aspect-auto lg:h-64"
      role="img"
      :aria-label="$t('overview.chart.title')"
    >
      <Bar :data="data" :options="options" :plugins="plugins" />
    </div>
  </div>
</template>
