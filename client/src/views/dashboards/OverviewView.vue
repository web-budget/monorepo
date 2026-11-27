<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { CalendarDays, CalendarPlus, Gauge, Plus } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FigureStrip, { type Figure } from '@/components/dashboards/FigureStrip.vue'
import FinancialFlowChart from '@/components/dashboards/FinancialFlowChart.vue'
import YearResultChart from '@/components/dashboards/YearResultChart.vue'
import ListState from '@/components/listing/ListState.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useServerErrors } from '@/composables/useServerErrors'
import { useOverviewStore } from '@/stores/overview'
import type { OverviewPeriod } from '@/types'
import { cutOf, formatRate, hasMovement, periodLabel } from '@/utils/overview'
import { queryValue } from '@/utils/queryValue'

const route = useRoute()
const router = useRouter()
const store = useOverviewStore()
const { overview } = storeToRefs(store)
const { messages, run } = useServerErrors()
const { t, locale } = useI18n()
const compact = useMediaQuery('(max-width: 767px)')

const currentYear = new Date().getFullYear()
const loadFailed = ref(false)
const goingToLatest = ref(false)

const requestedCut = computed(() => cutOf(queryValue(route.query.year), currentYear))

const needsLatestYear = computed(
  () =>
    overview.value !== null &&
    overview.value.years.length > 0 &&
    requestedCut.value !== 'all' &&
    !overview.value.years.includes(requestedCut.value),
)

const shownCut = computed(() => cutOf(overview.value!.cut, currentYear))
const selectedYear = computed(() => (shownCut.value === 'all' ? null : shownCut.value))

const yearChoices = computed(() => [
  ...[...overview.value!.years]
    .reverse()
    .map((year) => ({ value: String(year), label: String(year) })),
  { value: 'all', label: t('overview.all-periods') },
])

const cutLabel = computed(() =>
  shownCut.value === 'all' ? t('overview.summary.all-periods') : String(shownCut.value),
)

const figures = computed<Figure[]>(() => [
  { key: 'revenues', label: t('overview.figures.revenues') },
  { key: 'expenses', label: t('overview.figures.expenses') },
  { key: 'result', label: t('overview.figures.result') },
  { key: 'savings-rate', label: t('overview.figures.savings-rate') },
  { key: 'red-periods', label: t('overview.figures.red-periods') },
])

const rows = computed(() => overview.value!.periods.filter(hasMovement).reverse())

async function load() {
  loadFailed.value = !(await run(() => store.find(requestedCut.value)))
  goingToLatest.value = !loadFailed.value && needsLatestYear.value
  if (goingToLatest.value) {
    await changeYear(String(overview.value!.years[overview.value!.years.length - 1]))
  }
}

watch(requestedCut, load, { immediate: true })

function changeYear(value: unknown) {
  const next = String(value) === String(currentYear) ? undefined : String(value)
  return router.replace({ query: { ...route.query, year: next } })
}

function openMovements(period: OverviewPeriod) {
  return router.push({
    path: '/financial/movements',
    query: { period: period.financialPeriod.id },
  })
}

function createPeriod() {
  return router.push({ name: 'financial-periods.create' })
}
</script>

<template>
  <PageContainer>
    <PageHeader :title="$t('overview.title')">
      <template v-if="overview && overview.years.length > 0" #actions>
        <Select :model-value="String(requestedCut)" @update:model-value="changeYear">
          <SelectTrigger :aria-label="$t('overview.year')" class="w-auto">
            <CalendarDays />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="choice in yearChoices" :key="choice.value" :value="choice.value">
              {{ choice.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </template>
    </PageHeader>
    <ListState
      v-if="loadFailed"
      kind="error"
      entity="overview"
      :icon="Gauge"
      :message="messages[0]"
      @retry="load()"
    />
    <div v-else-if="!overview || goingToLatest" class="grid gap-5" data-slot="loading">
      <Skeleton class="h-24 w-full" />
      <div class="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Skeleton class="h-72" />
        <Skeleton class="h-72" />
      </div>
      <Skeleton class="h-56 w-full" />
    </div>
    <Card
      v-else-if="overview.years.length === 0"
      class="grid justify-items-center gap-2 px-6 py-14 text-center"
      role="status"
      data-state="empty"
    >
      <span class="bg-accent text-accent-foreground grid size-11 place-content-center rounded-md">
        <CalendarPlus class="size-5" />
      </span>
      <p class="text-base font-semibold">{{ $t('overview.empty.title') }}</p>
      <Button type="button" size="sm" class="mt-1" @click="createPeriod()">
        <Plus />
        {{ $t('overview.empty.action') }}
      </Button>
    </Card>
    <div v-else class="grid gap-5 *:min-w-0">
      <Card class="gap-0 overflow-hidden py-0" data-slot="summary">
        <div
          class="border-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5"
        >
          <h2 class="text-base font-semibold">
            {{ $t('overview.summary.title', { cut: cutLabel }) }}
          </h2>
        </div>
        <FigureStrip :figures="figures">
          <template #value-revenues>
            <CurrencyDisplay :value="overview.totals.revenues" tone="income" />
          </template>
          <template #value-expenses>
            <CurrencyDisplay :value="overview.totals.expenses" tone="expense" />
          </template>
          <template #value-result>
            <CurrencyDisplay
              :value="overview.totals.result"
              :signed="overview.totals.result < 0"
              glued
            />
          </template>
          <template #value-savings-rate>
            <span
              :class="[
                'font-mono tabular-nums',
                overview.totals.savingsRate !== null && overview.totals.savingsRate < 0
                  ? 'text-expense'
                  : '',
              ]"
              >{{ formatRate(overview.totals.savingsRate, locale) }}</span
            >
          </template>
          <template #value-red-periods>
            <span class="font-mono tabular-nums">{{ overview.totals.redPeriods }}</span>
            {{ ' ' }}
            <span class="text-muted-foreground text-base font-normal">
              {{ $t('overview.figures.red-of', { count: overview.totals.periodsWithMovement }) }}
            </span>
          </template>
        </FigureStrip>
      </Card>
      <div class="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" data-slot="charts">
        <Card class="content-start p-5">
          <FinancialFlowChart :periods="overview.periods" :cut="shownCut" />
        </Card>
        <Card class="content-start p-5">
          <YearResultChart :years="overview.resultByYear" :selected="selectedYear" />
        </Card>
      </div>
      <Card class="gap-0 overflow-hidden py-0" data-slot="periods">
        <Table v-if="!compact">
          <TableHeader>
            <TableRow>
              <TableHead>{{ $t('overview.table.period') }}</TableHead>
              <TableHead class="text-right">{{ $t('overview.table.revenues') }}</TableHead>
              <TableHead class="text-right">{{ $t('overview.table.expenses') }}</TableHead>
              <TableHead class="text-right">{{ $t('overview.table.result') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="period in rows"
              :key="period.financialPeriod.id"
              class="cursor-pointer"
              tabindex="0"
              @click="openMovements(period)"
              @keydown.enter="openMovements(period)"
            >
              <TableCell>{{ periodLabel(period.financialPeriod.endingAt, locale) }}</TableCell>
              <TableCell class="text-right">
                <CurrencyDisplay :value="period.revenues" tone="income" bare />
              </TableCell>
              <TableCell class="text-right">
                <CurrencyDisplay :value="period.expenses" tone="expense" bare />
              </TableCell>
              <TableCell class="text-right font-medium">
                <span class="inline-flex items-center justify-end gap-2">
                  <Badge v-if="!period.recorded" variant="highlight">
                    {{ $t('overview.provisional') }}
                  </Badge>
                  <CurrencyDisplay :value="period.result" :signed="period.result < 0" bare glued />
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <div v-else data-slot="period-cards">
          <div
            v-for="period in rows"
            :key="period.financialPeriod.id"
            class="border-border grid cursor-pointer gap-1.5 border-b px-3.5 py-3 last:border-b-0"
            tabindex="0"
            data-slot="period-card"
            @click="openMovements(period)"
            @keydown.enter="openMovements(period)"
          >
            <div class="flex items-start justify-between gap-3">
              <span class="font-medium">
                {{ periodLabel(period.financialPeriod.endingAt, locale) }}
              </span>
              <span class="inline-flex items-center justify-end gap-2 font-medium">
                <Badge v-if="!period.recorded" variant="highlight">
                  {{ $t('overview.provisional') }}
                </Badge>
                <CurrencyDisplay :value="period.result" :signed="period.result < 0" bare glued />
              </span>
            </div>
            <div class="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span>
                {{ $t('overview.figures.revenues') }}
                <CurrencyDisplay :value="period.revenues" tone="income" bare />
              </span>
              <span>
                {{ $t('overview.figures.expenses') }}
                <CurrencyDisplay :value="period.expenses" tone="expense" bare />
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </PageContainer>
</template>
