<script setup lang="ts">
import { CalendarRange, Clock, Plus } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import ListState from '@/components/listing/ListState.vue'
import PeriodStatusBadge from '@/components/listing/PeriodStatusBadge.vue'
import SearchControls from '@/components/listing/SearchControls.vue'
import PeriodRowActions from '@/components/periods/PeriodRowActions.vue'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/composables/useCrudList'
import { useReopenPeriod } from '@/composables/useReopenPeriod'
import { useFinancialPeriodsStore } from '@/stores/financialPeriods'
import { oldestExpired } from '@/utils/periods'

const { t } = useI18n()
const router = useRouter()

const store = useFinancialPeriodsStore()
const { pageRequest, pageResponse, loading, results, lastClosedId } = storeToRefs(store)

const statusOptions = [
  { label: 'financial-period.options.open', value: 'OPEN' },
  { label: 'financial-period.options.closed', value: 'CLOSED' },
  { label: 'financial-period.options.all', value: 'ALL' },
]

async function findAll() {
  await store.findAll()
  await store.loadClosedInformation(pageResponse.value.content)
}

const {
  messages,
  loadMessages,
  searchSummary,
  listState,
  busy,
  counts,
  search,
  clearSearch,
  reload,
  onPageChange,
  onTableSorted,
  changeToAdd,
  changeToUpdate,
  changeToDetail,
  remove,
} = useCrudList({
  routeName: 'financial-periods',
  entity: 'financial-period',
  initialStatus: 'OPEN',
  statuses: ['OPEN', 'CLOSED', 'ALL'],
  sortFields: ['name', 'status'],
  pageRequest,
  pageResponse,
  loading,
  findAll,
  count: store.count,
  remove: store.remove,
})

const reopening = useReopenPeriod(reload)

const expiredPeriods = computed(() => pageResponse.value.content.filter((period) => period.expired))
const expiredNames = computed(() => expiredPeriods.value.map((period) => period.name).join(', '))
const firstExpired = computed(() => oldestExpired(pageResponse.value.content))

const columns = computed(() => [
  { field: 'name', header: t('financial-period.table-columns.name'), sortable: true },
  { field: 'startingAt', header: t('financial-period.table-columns.starting-at'), mono: true },
  { field: 'endingAt', header: t('financial-period.table-columns.ending-at'), mono: true },
  {
    field: 'result',
    header: t('financial-period.table-columns.result'),
    align: 'end' as const,
  },
  { field: 'status', header: t('financial-period.table-columns.status'), sortable: true },
])

function closePeriod(id: string) {
  return router.push({ path: '/financial/closing', query: { period: id } })
}
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
    <div class="grid gap-3">
      <SearchControls
        v-model:status="pageRequest.status"
        v-model:filter="pageRequest.filterText"
        :placeholder="$t('financial-period.search.placeholder')"
        :status-options="statusOptions"
        :counts="counts"
        @on-filter-change="search()"
        @on-filter-reset="search()"
      />
      <Alert v-if="expiredPeriods.length > 0" variant="attention" data-slot="expired-notice">
        <Clock />
        <AlertTitle class="flex flex-wrap items-center gap-3">
          {{
            $t(
              'financial-period.list.expired-notice',
              { count: expiredPeriods.length, names: expiredNames },
              expiredPeriods.length,
            )
          }}
          <Button
            v-if="firstExpired"
            type="button"
            size="sm"
            variant="outline"
            @click="closePeriod(firstExpired.id)"
          >
            {{ $t('period-closing.actions.close-named', { name: firstExpired.name }) }}
          </Button>
        </AlertTitle>
      </Alert>
      <ServerErrorAlert :messages="[...messages, ...reopening.messages.value]" />
      <ListState
        v-if="listState !== 'table'"
        :kind="listState"
        entity="financial-period"
        :icon="CalendarRange"
        :query="pageRequest.filterText"
        :message="loadMessages[0]"
        @create="changeToAdd()"
        @clear="clearSearch()"
        @retry="reload()"
      />
      <ItemsTable
        v-else
        :data="pageResponse.content"
        :total-elements="pageResponse.totalElements"
        :summary="searchSummary"
        :columns="columns"
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
        <template #cell-result="{ item }">
          <span v-if="item.status === 'OPEN'" class="text-muted-foreground">
            {{ $t('financial-period.result.provisional') }}
          </span>
          <CurrencyDisplay v-else-if="results[item.id]" :value="results[item.id]!.result" signed />
          <span v-else class="text-muted-foreground">—</span>
        </template>
        <template #cell-status="{ item }"
          ><PeriodStatusBadge :status="item.status" :expired="item.expired"
        /></template>
        <template #actions="{ item }">
          <PeriodRowActions
            :status="item.status"
            :reopenable="item.id === lastClosedId"
            @close="closePeriod(item.id)"
            @edit="changeToUpdate(item.id)"
            @remove="remove(item)"
            @reopen="reopening.reopen(item)"
          />
        </template>
      </ItemsTable>
    </div>
  </PageContainer>
</template>
