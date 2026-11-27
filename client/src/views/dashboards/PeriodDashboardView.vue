<script setup lang="ts">
import { CalendarPlus, CalendarRange, Plus } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import BudgetCard from '@/components/dashboards/BudgetCard.vue'
import CardsUsageCard from '@/components/dashboards/CardsUsageCard.vue'
import PeriodGoalsCard from '@/components/dashboards/PeriodGoalsCard.vue'
import UpcomingCard from '@/components/dashboards/UpcomingCard.vue'
import ListState from '@/components/listing/ListState.vue'
import PeriodStatusBadge from '@/components/listing/PeriodStatusBadge.vue'
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
import { useServerErrors } from '@/composables/useServerErrors'
import { usePeriodDashboardStore } from '@/stores/periodDashboard'
import type { PeriodCard, PeriodUpcomingItem } from '@/types'
import { budgetTabOf, formatDate, type BudgetTab } from '@/utils/periodDashboard'
import { queryValue } from '@/utils/queryValue'

const route = useRoute()
const router = useRouter()
const store = usePeriodDashboardStore()
const { dashboard, periods } = storeToRefs(store)
const { messages, run } = useServerErrors()

const today = new Date()
const loadFailed = ref(false)
const ready = ref(false)

const requestedPeriod = computed(() => queryValue(route.query.period))

const tab = computed(() => budgetTabOf(queryValue(route.query.budget)))

const periodChoices = computed(() =>
  periods.value.map((period) => ({ value: period.id, label: period.name })),
)

async function load() {
  loadFailed.value = !(await run(async () => {
    await store.findPeriods()
    if (periods.value.length > 0) {
      await store.find(requestedPeriod.value || undefined)
    }
  }))
  ready.value = true
  if (dashboard.value?.period.current && requestedPeriod.value !== '') {
    await changeQuery({ period: undefined })
  }
}

let firstLoad = true

function alreadyShown(): boolean {
  const shown = dashboard.value
  if (shown === null) return false
  return requestedPeriod.value === ''
    ? shown.period.current
    : requestedPeriod.value === shown.period.id
}

watch(
  requestedPeriod,
  () => {
    if (!firstLoad && alreadyShown()) return
    if (firstLoad) store.reset()
    firstLoad = false
    return load()
  },
  { immediate: true },
)

function changeQuery(changes: Record<string, string | undefined>) {
  return router.replace({ query: { ...route.query, ...changes } })
}

function changePeriod(value: unknown) {
  return changeQuery({ period: String(value) })
}

function changeTab(next: BudgetTab) {
  return changeQuery({ budget: next === 'income' ? 'income' : undefined })
}

function editGoals() {
  return router.push({
    name: 'financial-periods.update',
    params: { id: dashboard.value!.period.id },
  })
}

function openMovement(item: PeriodUpcomingItem) {
  return router.push({ name: 'movements.detail', params: { id: item.id } })
}

function openInvoices(card: PeriodCard) {
  return router.push({
    name: 'invoices',
    query: { period: dashboard.value!.period.id, card: card.id },
  })
}

function createPeriod() {
  return router.push({ name: 'financial-periods.create' })
}
</script>

<template>
  <PageContainer>
    <PageHeader
      :title="$t('period-dashboard.title')"
      :description="
        dashboard
          ? $t('period-dashboard.range', {
              from: formatDate(dashboard.period.startingAt),
              to: formatDate(dashboard.period.endingAt),
            })
          : undefined
      "
    >
      <template v-if="dashboard" #badge>
        <PeriodStatusBadge :status="dashboard.period.status" />
      </template>
      <template v-if="dashboard" #actions>
        <Select :model-value="dashboard.period.id" @update:model-value="changePeriod">
          <SelectTrigger :aria-label="$t('period-dashboard.period')" class="w-auto">
            <CalendarRange />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="choice in periodChoices" :key="choice.value" :value="choice.value">
              {{ choice.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </template>
    </PageHeader>
    <ListState
      v-if="loadFailed"
      kind="error"
      entity="period-dashboard"
      :icon="CalendarRange"
      :message="messages[0]"
      @retry="load()"
    />
    <div v-else-if="!ready" class="grid gap-5" data-slot="loading">
      <Skeleton class="h-64 w-full" />
      <Skeleton class="h-72 w-full" />
      <Skeleton class="h-56 w-full" />
    </div>
    <Card
      v-else-if="!dashboard"
      class="grid justify-items-center gap-2 px-6 py-14 text-center"
      role="status"
      data-state="empty"
    >
      <span class="bg-accent text-accent-foreground grid size-11 place-content-center rounded-md">
        <CalendarPlus class="size-5" />
      </span>
      <p class="text-base font-semibold">{{ $t('period-dashboard.empty.title') }}</p>
      <Button type="button" size="sm" class="mt-1" @click="createPeriod()">
        <Plus />
        {{ $t('period-dashboard.empty.action') }}
      </Button>
    </Card>
    <div v-else class="grid gap-5 *:min-w-0">
      <PeriodGoalsCard
        :goals="dashboard.goals"
        :fixed-vs-variable="dashboard.fixedVsVariable"
        @edit-goals="editGoals()"
      />
      <BudgetCard :lines="dashboard.budget" :tab="tab" @update:tab="changeTab" />
      <UpcomingCard
        v-if="dashboard.upcoming"
        :upcoming="dashboard.upcoming"
        :today="today"
        @open="openMovement"
      />
      <CardsUsageCard
        v-if="dashboard.cards.length > 0"
        :cards="dashboard.cards"
        @open="openInvoices"
      />
    </div>
  </PageContainer>
</template>
