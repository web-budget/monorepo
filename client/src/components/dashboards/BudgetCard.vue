<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { ChevronDown } from 'lucide-vue-next'
import { computed } from 'vue'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import MeterBar from '@/components/dashboards/MeterBar.vue'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { PeriodBudgetLine } from '@/types'
import { goalPercentage, goalSignal, meterWidth } from '@/utils/goalSignal'
import { budgetRows, hasSuggestions, type BudgetRow, type BudgetTab } from '@/utils/periodDashboard'

const props = defineProps<{ lines: PeriodBudgetLine[]; tab: BudgetTab }>()

const emit = defineEmits<{ 'update:tab': [tab: BudgetTab] }>()

const TABS: BudgetTab[] = ['expense', 'income']

const compact = useMediaQuery('(max-width: 767px)')

const rows = computed(() => budgetRows(props.lines, props.tab))

const withSuggestion = computed(() => hasSuggestions(props.lines))

function budgetOf(row: BudgetRow): number | null {
  return row.figures.budget !== null && row.figures.budget > 0 ? row.figures.budget : null
}

function percentageOf(row: BudgetRow): number {
  return Math.round(goalPercentage(row.figures.used, budgetOf(row)!))
}

function signalOf(row: BudgetRow) {
  return goalSignal(props.tab, row.figures.used, budgetOf(row)!)
}

function overspent(row: BudgetRow): boolean {
  return props.tab === 'expense' && budgetOf(row) !== null && row.figures.used > budgetOf(row)!
}
</script>

<template>
  <Card class="gap-0 overflow-hidden py-0" data-slot="budget">
    <div
      class="border-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5"
    >
      <h2 class="text-base font-semibold">{{ $t('period-dashboard.budget.title') }}</h2>
      <div
        class="bg-muted inline-flex h-9 items-center gap-0.5 rounded-md p-1"
        role="group"
        :aria-label="$t('period-dashboard.budget.tabs')"
      >
        <button
          v-for="option in TABS"
          :key="option"
          type="button"
          :aria-pressed="tab === option"
          class="text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs inline-flex h-7 items-center justify-center rounded-sm px-3 text-sm font-medium transition-colors"
          @click="emit('update:tab', option)"
        >
          {{ $t(`period-dashboard.budget.${option}`) }}
        </button>
      </div>
    </div>
    <Table v-if="!compact" data-slot="budget-table">
      <TableHeader>
        <TableRow>
          <TableHead>{{ $t('period-dashboard.budget.cost-center') }}</TableHead>
          <TableHead class="text-right">{{ $t('period-dashboard.budget.budget') }}</TableHead>
          <TableHead class="text-right">{{ $t(`period-dashboard.budget.${tab}-used`) }}</TableHead>
          <TableHead class="text-right">{{ $t(`period-dashboard.budget.${tab}-share`) }}</TableHead>
          <TableHead v-if="withSuggestion" class="text-right">{{
            $t('period-dashboard.budget.suggested')
          }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="row in rows" :key="row.id" data-slot="budget-row">
          <TableCell>
            <span class="flex items-center gap-1.5" :style="{ paddingLeft: `${row.depth * 20}px` }">
              <ChevronDown v-if="row.hasChildren" class="text-muted-foreground size-3.5" />
              <span v-else class="inline-block w-3.5" />
              <span :class="row.depth === 0 && 'font-medium'">{{ row.name }}</span>
              <Badge v-if="overspent(row)" variant="blocked" data-slot="overspent">{{
                $t('period-dashboard.budget.overspent')
              }}</Badge>
            </span>
          </TableCell>
          <TableCell class="text-right" data-slot="budget-value">
            <CurrencyDisplay v-if="budgetOf(row) !== null" :value="budgetOf(row)" bare />
          </TableCell>
          <TableCell class="text-right" data-slot="used-value">
            <CurrencyDisplay :value="row.figures.used" bare />
          </TableCell>
          <TableCell class="text-right" data-slot="share-value">
            <span v-if="budgetOf(row) !== null" class="flex items-center justify-end gap-2.5">
              <MeterBar
                class="w-24"
                :width="meterWidth(row.figures.used, budgetOf(row)!)"
                :signal="signalOf(row)"
                :label="`${row.name}: ${percentageOf(row)}%`"
              />
              <span class="w-11 text-right font-mono text-[13px] tabular-nums"
                >{{ percentageOf(row) }}%</span
              >
            </span>
          </TableCell>
          <TableCell v-if="withSuggestion" class="text-right" data-slot="suggested-value">
            <CurrencyDisplay
              v-if="row.figures.suggested !== null"
              class="text-muted-foreground"
              :value="row.figures.suggested"
              bare
            />
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <div v-else data-slot="budget-cards">
      <div
        v-for="row in rows"
        :key="row.id"
        class="border-border grid gap-1.5 border-b px-3.5 py-3 last:border-b-0"
        data-slot="budget-card"
      >
        <div class="flex items-start justify-between gap-3">
          <span
            class="flex min-w-0 flex-wrap items-center gap-1.5"
            :style="{ paddingLeft: `${row.depth * 14}px` }"
          >
            <span :class="row.depth === 0 && 'font-medium'">{{ row.name }}</span>
            <Badge v-if="overspent(row)" variant="blocked" data-slot="overspent">{{
              $t('period-dashboard.budget.overspent')
            }}</Badge>
          </span>
          <CurrencyDisplay class="shrink-0" :value="row.figures.used" bare />
        </div>
        <div
          v-if="budgetOf(row) !== null"
          class="flex items-center gap-2.5"
          :style="{ paddingLeft: `${row.depth * 14}px` }"
        >
          <MeterBar
            class="flex-1"
            :width="meterWidth(row.figures.used, budgetOf(row)!)"
            :signal="signalOf(row)"
            :label="`${row.name}: ${percentageOf(row)}%`"
          />
          <span class="text-muted-foreground font-mono text-xs"
            >{{ percentageOf(row) }}% {{ $t('period-dashboard.budget.of') }}
            <CurrencyDisplay :value="budgetOf(row)" bare
          /></span>
        </div>
        <div
          v-if="row.figures.suggested !== null"
          class="text-muted-foreground text-xs"
          :style="{ paddingLeft: `${row.depth * 14}px` }"
          data-slot="suggested-card"
        >
          {{ $t('period-dashboard.budget.suggested-short') }}
          <CurrencyDisplay :value="row.figures.suggested" bare />
        </div>
      </div>
    </div>
  </Card>
</template>
