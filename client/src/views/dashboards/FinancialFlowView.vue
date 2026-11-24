<script setup lang="ts">
import { CalendarDays, ChartColumn } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FinancialFlowChart from '@/components/dashboards/FinancialFlowChart.vue'
import ListState from '@/components/listing/ListState.vue'
import { Badge } from '@/components/ui/badge'
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
import { useFinancialFlowStore } from '@/stores/financialFlow'
import type { FinancialFlowPeriod } from '@/types'
import { hasMovement, periodLabel } from '@/utils/financialFlow'
import { queryValue } from '@/utils/queryValue'

const FIRST_YEAR = 2020

const route = useRoute()
const router = useRouter()
const store = useFinancialFlowStore()
const { flow, loading } = storeToRefs(store)
const { messages, run } = useServerErrors()
const { locale } = useI18n()

const currentYear = new Date().getFullYear()
const loadFailed = ref(false)

const yearChoices = computed(() =>
  Array.from({ length: currentYear - FIRST_YEAR + 1 }, (_, index) => {
    const year = String(currentYear - index)
    return { value: year, label: year }
  }),
)

function yearOf(value: unknown): number {
  const year = Number(queryValue(value as string))
  return Number.isInteger(year) && year >= FIRST_YEAR && year <= currentYear ? year : currentYear
}

const year = computed(() => yearOf(route.query.year))
const withMovement = computed(() => flow.value!.periods.filter(hasMovement))
const newestFirst = computed(() => [...withMovement.value].reverse())

async function load() {
  loadFailed.value = !(await run(() => store.find(year.value)))
}

watch(year, load, { immediate: true })

function changeYear(value: unknown) {
  const next = String(value) === String(currentYear) ? undefined : String(value)
  return router.replace({ query: { ...route.query, year: next } })
}

function outflow(expenses: number): number {
  return expenses === 0 ? 0 : -expenses
}

function openMovements(period: FinancialFlowPeriod) {
  return router.push({
    path: '/financial/movements',
    query: { period: period.financialPeriod.id },
  })
}
</script>

<template>
  <PageContainer>
    <PageHeader :title="$t('financial-flow.title')" :description="$t('financial-flow.description')">
      <template #actions>
        <Select :model-value="String(year)" @update:model-value="changeYear">
          <SelectTrigger :aria-label="$t('financial-flow.year')" class="w-auto">
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
      entity="financial-flow"
      :icon="ChartColumn"
      :message="messages[0]"
      @retry="load()"
    />
    <div v-else-if="loading && !flow" class="grid gap-3" data-slot="loading">
      <Skeleton class="h-24 w-full" />
      <Skeleton class="h-72 w-full" />
    </div>
    <div v-else-if="flow" class="grid gap-4 *:min-w-0">
      <div class="grid grid-cols-2 gap-3 xl:grid-cols-3" data-slot="totals">
        <Card class="gap-1 p-4 pb-5">
          <span class="text-muted-foreground text-xs">{{
            $t('financial-flow.totals.revenues')
          }}</span>
          <CurrencyDisplay
            :value="flow.totals.revenues"
            class="text-income text-xl font-semibold tracking-tight md:text-2xl"
          />
        </Card>
        <Card class="gap-1 p-4 pb-5">
          <span class="text-muted-foreground text-xs">{{
            $t('financial-flow.totals.expenses')
          }}</span>
          <CurrencyDisplay
            :value="flow.totals.expenses"
            class="text-expense text-xl font-semibold tracking-tight md:text-2xl"
          />
        </Card>
        <Card class="gap-1 p-4 pb-5">
          <span class="text-muted-foreground text-xs">{{
            $t('financial-flow.totals.result')
          }}</span>
          <CurrencyDisplay
            :value="flow.totals.result"
            class="text-xl font-semibold tracking-tight md:text-2xl"
          />
        </Card>
      </div>
      <Card
        v-if="withMovement.length === 0"
        class="grid justify-items-center gap-2 px-6 py-14 text-center"
        role="status"
        data-state="empty"
      >
        <span class="bg-accent text-accent-foreground grid size-11 place-content-center rounded-md">
          <ChartColumn class="size-5" />
        </span>
        <p class="text-base font-semibold">
          {{ $t('financial-flow.empty.title', { year: flow.year }) }}
        </p>
        <p class="text-muted-foreground max-w-sm text-sm">
          {{ $t('financial-flow.empty.description') }}
        </p>
      </Card>
      <template v-else>
        <Card class="p-5">
          <FinancialFlowChart :periods="flow.periods" />
        </Card>
        <Card class="gap-0 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{{ $t('financial-flow.table.period') }}</TableHead>
                <TableHead class="text-right">{{ $t('financial-flow.table.revenues') }}</TableHead>
                <TableHead class="text-right">{{ $t('financial-flow.table.expenses') }}</TableHead>
                <TableHead class="text-right">{{ $t('financial-flow.table.result') }}</TableHead>
                <TableHead>{{ $t('financial-flow.table.status') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="period in newestFirst"
                :key="period.financialPeriod.id"
                class="cursor-pointer"
                tabindex="0"
                @click="openMovements(period)"
                @keydown.enter="openMovements(period)"
              >
                <TableCell>{{ periodLabel(period.financialPeriod.endingAt, locale) }}</TableCell>
                <TableCell class="text-right">
                  <CurrencyDisplay :value="period.revenues" signed bare glued />
                </TableCell>
                <TableCell class="text-right">
                  <CurrencyDisplay :value="outflow(period.expenses)" signed bare glued />
                </TableCell>
                <TableCell class="text-right font-medium">
                  <CurrencyDisplay :value="period.result" signed bare glued />
                </TableCell>
                <TableCell>
                  <Badge :variant="period.recorded ? 'neutral' : 'highlight'">
                    {{
                      $t(
                        period.recorded
                          ? 'financial-flow.status.recorded'
                          : 'financial-flow.status.provisional',
                      )
                    }}
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </template>
    </div>
  </PageContainer>
</template>
