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
import { useAppearanceStore } from '@/stores/appearance'
import type { FinancialFlowPeriod } from '@/types'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

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

function monthOf(endingAt: string) {
  return new Date(`${endingAt}T00:00:00`).toLocaleDateString(locale.value, { month: 'short' })
}

const data = computed<ChartData<'bar'>>(() => ({
  labels: props.periods.map((period) => monthOf(period.financialPeriod.endingAt)),
  datasets: [
    {
      label: t('financial-flow.legend.revenues'),
      data: props.periods.map((period) => period.revenues),
      backgroundColor: props.periods.map((period) =>
        period.recorded ? colors.value.income : colors.value.incomeMuted,
      ),
      borderColor: colors.value.income,
      borderWidth: props.periods.map((period) => (period.recorded ? 0 : 1.5)),
      borderDash: [4, 3],
    },
    {
      label: t('financial-flow.legend.expenses'),
      data: props.periods.map((period) => period.expenses),
      backgroundColor: props.periods.map((period) =>
        period.recorded ? colors.value.expense : colors.value.expenseMuted,
      ),
      borderColor: colors.value.expense,
      borderWidth: props.periods.map((period) => (period.recorded ? 0 : 1.5)),
      borderDash: [4, 3],
    },
  ],
}))

const options = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: colors.value.text },
    },
    y: {
      grid: { color: colors.value.border },
      ticks: {
        color: colors.value.text,
        font: { family: colors.value.mono },
        callback: (value) => n(Number(value), 'currency'),
      },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        title: (items: TooltipItem<'bar'>[]) =>
          props.periods[items[0]!.dataIndex]!.financialPeriod.name,
        label: (item: TooltipItem<'bar'>) =>
          `${item.dataset.label}: ${n(Number(item.raw), 'currency')}`,
      },
    },
  },
}))
</script>

<template>
  <div class="grid gap-3" data-slot="financial-flow-chart">
    <ul
      class="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 text-xs"
      data-slot="chart-legend"
    >
      <li class="inline-flex items-center gap-1.5">
        <span class="bg-income size-2.5 rounded-xs" />{{ $t('financial-flow.legend.revenues') }}
      </li>
      <li class="inline-flex items-center gap-1.5">
        <span class="bg-expense size-2.5 rounded-xs" />{{ $t('financial-flow.legend.expenses') }}
      </li>
      <li class="inline-flex items-center gap-1.5">
        <span class="bg-income-muted border-income size-2.5 rounded-xs border border-dashed" />
        {{ $t('financial-flow.legend.provisional') }}
      </li>
    </ul>
    <div class="h-72" role="img" :aria-label="$t('financial-flow.chart.title')">
      <Bar :data="data" :options="options" />
    </div>
  </div>
</template>
