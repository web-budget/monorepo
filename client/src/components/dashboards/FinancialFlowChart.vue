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
import { emptyMonthsPlugin } from '@/components/dashboards/emptyMonthsPlugin'
import { useAppearanceStore } from '@/stores/appearance'
import type { FinancialFlowPeriod } from '@/types'
import { axisScale, flowMonths } from '@/utils/financialFlow'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const plugins = [emptyMonthsPlugin]

const DESIGN_WIDTH = 720
const MIN_FONT_SIZE = 10
const MAX_FONT_SIZE = 16

const props = defineProps<{ periods: FinancialFlowPeriod[] }>()

const { t, n, locale } = useI18n()
const appearance = useAppearanceStore()

function readColors() {
  const styles = getComputedStyle(document.documentElement)
  const read = (token: string) => styles.getPropertyValue(token).trim()
  return {
    income: read('--income'),
    incomeMuted: read('--income-muted'),
    expense: read('--expense'),
    expenseMuted: read('--expense-muted'),
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

const months = computed(() => flowMonths(props.periods, locale.value))

const axis = computed(() =>
  axisScale(Math.max(...months.value.flatMap((month) => [month.revenues, month.expenses]))),
)

const integer = computed(() => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 0 }))

const data = computed<ChartData<'bar'>>(() => ({
  labels: months.value.map((month) => month.label),
  datasets: [
    {
      label: t('financial-flow.legend.revenues'),
      data: months.value.map((month) => month.revenues),
      backgroundColor: months.value.map((month) =>
        month.recorded ? colors.value.income : colors.value.incomeMuted,
      ),
      borderColor: colors.value.income,
      borderWidth: months.value.map((month) => (month.recorded ? 0 : 1.5)),
      borderDash: [4, 3],
      categoryPercentage: 0.64,
      barPercentage: 0.96,
    },
    {
      label: t('financial-flow.legend.expenses'),
      data: months.value.map((month) => month.expenses),
      backgroundColor: months.value.map((month) =>
        month.recorded ? colors.value.expense : colors.value.expenseMuted,
      ),
      borderColor: colors.value.expense,
      borderWidth: months.value.map((month) => (month.recorded ? 0 : 1.5)),
      borderDash: [4, 3],
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
      ticks: { color: colors.value.text, font: scaledFont(12), maxRotation: 0 },
    },
    y: {
      min: 0,
      max: axis.value.max,
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
    emptyMonths: {
      indexes: months.value.flatMap((month, index) => (month.empty ? [index] : [])),
      color: colors.value.text,
      font: colors.value.mono,
    },
    tooltip: {
      callbacks: {
        title: (items: TooltipItem<'bar'>[]) => {
          const month = months.value[items[0]!.dataIndex]!
          return month.periodNames.length > 0 ? month.periodNames.join(', ') : month.label
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
      <h2 class="text-base font-semibold">{{ $t('financial-flow.chart.title') }}</h2>
      <ul
        class="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs"
        data-slot="chart-legend"
      >
        <li class="inline-flex items-center gap-1.5">
          <span class="bg-income size-2.5 rounded-[1px]" />{{
            $t('financial-flow.legend.revenues')
          }}
        </li>
        <li class="inline-flex items-center gap-1.5">
          <span class="bg-expense size-2.5 rounded-[1px]" />{{
            $t('financial-flow.legend.expenses')
          }}
        </li>
        <li class="inline-flex items-center gap-1.5">
          <span class="border-muted-foreground size-2.5 rounded-[1px] border border-dashed" />
          {{ $t('financial-flow.legend.provisional') }}
        </li>
      </ul>
    </div>
    <div
      class="h-48 w-full min-w-0 md:aspect-[720/260] md:h-auto"
      role="img"
      :aria-label="$t('financial-flow.chart.title')"
    >
      <Bar :data="data" :options="options" :plugins="plugins" />
    </div>
  </div>
</template>
