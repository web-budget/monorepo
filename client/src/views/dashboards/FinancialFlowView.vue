<script setup lang="ts">
import { ChartColumn } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FinancialFlowChart from '@/components/dashboards/FinancialFlowChart.vue'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import ListState from '@/components/listing/ListState.vue'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useServerErrors } from '@/composables/useServerErrors'
import { useFinancialFlowStore } from '@/stores/financialFlow'
import type { FinancialFlowPeriod } from '@/types'
import { queryValue } from '@/utils/queryValue'

const FIRST_YEAR = 2020

const route = useRoute()
const router = useRouter()
const store = useFinancialFlowStore()
const { flow, loading } = storeToRefs(store)
const { messages, run } = useServerErrors()

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
const newestFirst = computed(() => [...flow.value!.periods].reverse())

async function load() {
  loadFailed.value = !(await run(() => store.find(year.value)))
}

watch(year, load, { immediate: true })

function changeYear(value: string) {
  const next = value === String(currentYear) ? undefined : value
  return router.replace({ query: { ...route.query, year: next } })
}

function openMovements(period: FinancialFlowPeriod) {
  return router.push({
    path: '/financial/movements',
    query: { period: period.financialPeriod.id },
  })
}
</script>

<template>
  <PageContainer class="gap-6">
    <PageHeader :title="$t('financial-flow.title')" :description="$t('financial-flow.description')">
      <template #actions>
        <FilterSelect
          class="w-36"
          :label="$t('financial-flow.year')"
          :none-label="String(currentYear)"
          :options="yearChoices"
          :model-value="String(year)"
          @update:model-value="changeYear"
        />
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
    <template v-else-if="flow">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3" data-slot="totals">
        <Card class="gap-1 p-4">
          <span class="text-muted-foreground text-xs">{{
            $t('financial-flow.totals.revenues')
          }}</span>
          <CurrencyDisplay :value="flow.totals.revenues" signed class="text-xl font-semibold" />
        </Card>
        <Card class="gap-1 p-4">
          <span class="text-muted-foreground text-xs">{{
            $t('financial-flow.totals.expenses')
          }}</span>
          <CurrencyDisplay :value="-flow.totals.expenses" signed class="text-xl font-semibold" />
        </Card>
        <Card class="gap-1 p-4">
          <span class="text-muted-foreground text-xs">{{
            $t('financial-flow.totals.result')
          }}</span>
          <CurrencyDisplay :value="flow.totals.result" signed class="text-xl font-semibold" />
        </Card>
      </div>
      <Card
        v-if="flow.periods.length === 0"
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
        <Card class="gap-3 p-5">
          <h2 class="text-base font-semibold">{{ $t('financial-flow.chart.title') }}</h2>
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
                @click="openMovements(period)"
              >
                <TableCell>
                  <RouterLink
                    :to="{
                      path: '/financial/movements',
                      query: { period: period.financialPeriod.id },
                    }"
                    class="font-medium underline-offset-2 hover:underline"
                    @click.stop
                  >
                    {{ period.financialPeriod.name }}
                  </RouterLink>
                </TableCell>
                <TableCell class="text-right"
                  ><CurrencyDisplay :value="period.revenues"
                /></TableCell>
                <TableCell class="text-right"
                  ><CurrencyDisplay :value="period.expenses"
                /></TableCell>
                <TableCell class="text-right">
                  <CurrencyDisplay :value="period.result" signed />
                </TableCell>
                <TableCell>
                  <Badge :variant="period.recorded ? 'neutral' : 'pending'">
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
    </template>
  </PageContainer>
</template>
