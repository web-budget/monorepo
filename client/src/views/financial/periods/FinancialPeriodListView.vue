<script setup lang="ts">
import { CalendarRange, Clock, Ellipsis, Pencil, Plus } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import ListState from '@/components/listing/ListState.vue'
import PeriodStatusBadge from '@/components/listing/PeriodStatusBadge.vue'
import StatusTabs from '@/components/listing/StatusTabs.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCrudList } from '@/composables/useCrudList'
import { useServerErrors } from '@/composables/useServerErrors'
import { useFinancialPeriodsStore } from '@/stores/financialPeriods'
import type { FinancialPeriodListView, FinancialPeriodStatusFilter } from '@/types'

const { t } = useI18n()

const store = useFinancialPeriodsStore()
const { pageRequest, pageResponse, loading } = storeToRefs(store)

const statusOptions = [
  { label: 'financial-period.options.open', value: 'OPEN' },
  { label: 'financial-period.options.closed', value: 'CLOSED' },
  { label: 'financial-period.options.all', value: 'ALL' },
]

const {
  messages,
  loadMessages,
  searchSummary,
  listState,
  busy,
  counts,
  search,
  reload,
  onPageChange,
  onTableSorted,
  changeToAdd,
  changeToUpdate,
  changeToDetail,
} = useCrudList({
  routeName: 'financial-periods',
  entity: 'financial-period',
  initialStatus: 'OPEN',
  statuses: ['OPEN', 'CLOSED', 'ALL'],
  sortFields: ['name', 'startingAt', 'endingAt', 'status'],
  defaultSort: { sortField: 'startingAt', direction: 'desc' },
  pageRequest,
  pageResponse,
  loading,
  findAll: store.findAll,
  count: store.count,
  remove: store.remove,
})

const expiredErrors = useServerErrors()
const expiredPeriods = ref<FinancialPeriodListView[]>([])
const results = ref<Record<string, number>>({})

async function loadExpired() {
  await expiredErrors.run(async () => {
    expiredPeriods.value = await store.findExpired()
  })
}

async function loadResults() {
  const closed = pageResponse.value.content.filter((period) => period.status === 'CLOSED')
  const entries = await Promise.all(
    closed.map(async (period) => [period.id, (await store.findResult(period.id)).result] as const),
  )
  results.value = Object.fromEntries(entries)
}

onMounted(loadExpired)
watch(() => pageResponse.value.content, loadResults, { immediate: true })

const expiredNames = computed(() => expiredPeriods.value.map((period) => period.name).join(', '))

const columns = computed(() => [
  {
    field: 'name',
    header: t('financial-period.table-columns.name'),
    sortable: true,
    mobile: 'title' as const,
  },
  {
    field: 'startingAt',
    header: t('financial-period.table-columns.starting-at'),
    sortable: true,
    mono: true,
    mobile: 'line' as const,
  },
  {
    field: 'endingAt',
    header: t('financial-period.table-columns.ending-at'),
    sortable: true,
    mono: true,
    mobile: 'line' as const,
  },
  {
    field: 'revenuesGoal',
    header: t('financial-period.table-columns.revenues-goal'),
    align: 'end' as const,
    mono: true,
    mobile: 'hide' as const,
  },
  {
    field: 'expensesGoal',
    header: t('financial-period.table-columns.expenses-goal'),
    align: 'end' as const,
    mono: true,
    mobile: 'hide' as const,
  },
  {
    field: 'result',
    header: t('financial-period.table-columns.result'),
    align: 'end' as const,
    mobile: 'value' as const,
  },
  {
    field: 'status',
    header: t('financial-period.table-columns.status'),
    sortable: true,
    mobile: 'line' as const,
    mobileLabel: false,
  },
])

function selectStatus(status: string) {
  pageRequest.value.status = status as FinancialPeriodStatusFilter
  return search()
}

const listCopy = computed(() => ({
  emptyTitle: t('financial-period.list.empty-title'),
  emptyDescription: t('financial-period.list.empty-description'),
  errorDescription: t('movement.list.error-description'),
}))
</script>

<template>
  <PageContainer class="gap-6">
    <PageHeader
      :title="$t('financial-period.title')"
      :description="$t('financial-period.list.description')"
    >
      <template #actions>
        <Button type="button" @click="changeToAdd()"> <Plus />{{ $t('form.create') }} </Button>
      </template>
    </PageHeader>
    <div class="grid gap-4">
      <Alert v-if="expiredPeriods.length > 0" variant="attention" data-slot="expired-notice">
        <Clock />
        <AlertTitle>
          {{
            $t(
              'financial-period.list.expired-notice.title',
              { count: expiredPeriods.length, names: expiredNames },
              expiredPeriods.length,
            )
          }}
        </AlertTitle>
        <AlertDescription>
          {{ $t('financial-period.list.expired-notice.description', expiredPeriods.length) }}
        </AlertDescription>
      </Alert>
      <Card class="flex-row flex-wrap items-center justify-between gap-3 p-4" data-slot="tabs-card">
        <StatusTabs
          :status="pageRequest.status"
          :options="statusOptions"
          :counts="counts"
          @select="selectStatus"
        />
        <span class="text-muted-foreground text-xs">
          {{ $t('financial-period.list.tabs-note') }}
        </span>
      </Card>
      <ServerErrorAlert :messages="[...messages, ...expiredErrors.messages.value]" />
      <ListState
        v-if="listState !== 'table'"
        :kind="listState"
        entity="financial-period"
        :icon="CalendarRange"
        :query="pageRequest.filterText"
        :message="loadMessages[0]"
        :copy="listCopy"
        @create="changeToAdd()"
        @clear="selectStatus('ALL')"
        @retry="reload()"
      />
      <ItemsTable
        active-sort-icon-only
        v-else
        :data="pageResponse.content"
        :total-elements="pageResponse.totalElements"
        :summary="searchSummary"
        :noun="$t('financial-period.list.noun', pageResponse.totalElements)"
        :columns="columns"
        default-sort-field="startingAt"
        :show-status="false"
        :marked-row="(period) => period.expired"
        :loading="busy"
        :current-page="pageRequest.current"
        :page-size="pageRequest.size"
        :sorted-field="pageRequest.sortField"
        :sorted-order="pageRequest.direction"
        detail-route="financial-periods.detail"
        @page-changed="onPageChange"
        @table-sorted="onTableSorted"
        @row-selected="changeToDetail"
      >
        <template #cell-startingAt="{ item }">
          <DateTimeDisplay fix-time :value="item.startingAt" />
        </template>
        <template #cell-endingAt="{ item }">
          <DateTimeDisplay fix-time :value="item.endingAt" />
        </template>
        <template #cell-revenuesGoal="{ item }">
          <CurrencyDisplay :value="item.revenuesGoal ?? null" bare zero-if-null />
        </template>
        <template #cell-expensesGoal="{ item }">
          <CurrencyDisplay :value="item.expensesGoal ?? null" bare zero-if-null />
        </template>
        <template #cell-result="{ item }">
          <CurrencyDisplay
            v-if="item.status === 'CLOSED' && results[item.id] !== undefined"
            :value="results[item.id] as number"
            signed
            glued
            bare
          />
          <span v-else class="text-muted-foreground">{{
            $t('financial-period.list.provisional')
          }}</span>
        </template>
        <template #cell-status="{ item }">
          <PeriodStatusBadge :status="item.status" :expired="item.expired" />
        </template>
        <template #actions="{ item }">
          <DropdownMenu v-if="item.status === 'OPEN'">
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="icon-sm" :aria-label="$t('crud.actions.more')">
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="min-w-44">
              <DropdownMenuItem @select="changeToUpdate(item.id)">
                <Pencil />{{ $t('financial-period.list.edit') }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </template>
      </ItemsTable>
    </div>
  </PageContainer>
</template>
