<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { CompositionView } from '@/types'
import { heatColor, longMonth, seasonRows, shortMonth, type SeasonRow } from '@/utils/composition'

const props = defineProps<{ composition: CompositionView; average: boolean; year: string }>()

const { t, n, locale } = useI18n()

const STEPS = [0.05, 0.25, 0.5, 0.75, 1]
const MONTHS = Array.from({ length: 12 }, (_, index) => index)

const compact = useMediaQuery('(max-width: 767px)')

const rows = computed(() => seasonRows(props.composition))

function color(row: SeasonRow, value: number): string {
  return heatColor(value, row.low, row.high)
}

function tip(row: SeasonRow, month: number, value: number | null): string {
  if (value === null) {
    return `${row.name} · ${longMonth(month, locale.value)} · —`
  }
  const when = props.average
    ? t('composition.season.average-of', { month: longMonth(month, locale.value) })
    : t('composition.season.month-of-year', {
        month: longMonth(month, locale.value),
        year: props.year,
      })
  return `${row.name} · ${when} · ${n(value, 'currency')}`
}
</script>

<template>
  <Card class="gap-0 overflow-hidden py-0" data-slot="seasonality">
    <div
      class="border-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5"
    >
      <h2 class="text-base font-semibold">
        {{ average ? $t('composition.season.title-average') : $t('composition.season.title') }}
      </h2>
      <span class="text-muted-foreground flex items-center gap-1.5 text-xs" data-slot="scale">
        {{ $t('composition.season.less') }}
        <span
          v-for="step in STEPS"
          :key="step"
          class="h-3 w-5 rounded-[2px]"
          :style="{ background: heatColor(step, 0, 1) }"
        />
        {{ $t('composition.season.more') }}
      </span>
    </div>
    <Table v-if="!compact" data-slot="season-table">
      <TableHeader>
        <TableRow>
          <TableHead>{{ $t('composition.season.classification') }}</TableHead>
          <TableHead v-for="month in MONTHS" :key="month" class="px-0 text-center">{{
            shortMonth(month, locale)
          }}</TableHead>
          <TableHead class="text-right">{{ $t('composition.season.total') }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="row in rows" :key="row.id" data-slot="season-row">
          <TableCell>{{ row.name }}</TableCell>
          <TableCell v-for="month in MONTHS" :key="month" class="px-px">
            <span
              v-if="row.months[month] !== null"
              :class="[
                'relative block h-6 min-w-[26px] rounded-[2px]',
                'after:bg-foreground after:text-background after:absolute after:bottom-full after:left-1/2 after:z-10 after:hidden after:-translate-x-1/2 after:rounded-sm after:px-2 after:py-1 after:text-xs after:whitespace-nowrap after:content-[attr(data-tip)]',
                'hover:after:block focus-visible:after:block',
              ]"
              :style="{ background: color(row, row.months[month]!) }"
              :data-tip="tip(row, month, row.months[month]!)"
              :aria-label="tip(row, month, row.months[month]!)"
              tabindex="0"
              data-slot="season-cell"
            />
            <span
              v-else
              class="text-muted-foreground grid h-6 min-w-[26px] place-content-center text-[10px]"
              :aria-label="tip(row, month, null)"
              data-slot="season-empty"
              >—</span
            >
          </TableCell>
          <TableCell class="text-right" data-slot="season-total">
            <CurrencyDisplay :value="row.total" bare />
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <div v-else data-slot="season-strips">
      <div
        class="text-muted-foreground grid grid-cols-12 gap-0.5 px-3.5 pt-3 text-center text-[10px]"
        data-slot="season-initials"
      >
        <span v-for="month in MONTHS" :key="month">{{ shortMonth(month, locale).charAt(0) }}</span>
      </div>
      <div
        v-for="row in rows"
        :key="row.id"
        class="border-border grid gap-1.5 border-b px-3.5 py-3 last:border-b-0"
        data-slot="season-strip"
      >
        <div class="flex items-baseline justify-between gap-3 text-sm">
          <span>{{ row.name }}</span>
          <CurrencyDisplay class="text-xs" :value="row.total" bare />
        </div>
        <div class="grid grid-cols-12 gap-0.5">
          <template v-for="month in MONTHS" :key="month">
            <span
              v-if="row.months[month] !== null"
              class="block h-5 rounded-[2px]"
              :style="{ background: color(row, row.months[month]!) }"
              :title="tip(row, month, row.months[month]!)"
              :aria-label="tip(row, month, row.months[month]!)"
              tabindex="0"
              data-slot="strip-cell"
            />
            <span
              v-else
              class="text-muted-foreground grid h-5 place-content-center text-[10px]"
              :aria-label="tip(row, month, null)"
              data-slot="strip-empty"
              >—</span
            >
          </template>
        </div>
      </div>
    </div>
  </Card>
</template>
