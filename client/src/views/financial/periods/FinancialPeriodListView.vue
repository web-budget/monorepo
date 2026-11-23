<script setup lang="ts">
import { CalendarRange, Clock, Plus } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ActionButtons from '@/components/listing/ActionButtons.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import ListState from '@/components/listing/ListState.vue'
import PeriodStatusBadge from '@/components/listing/PeriodStatusBadge.vue'
import SearchControls from '@/components/listing/SearchControls.vue'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/composables/useCrudList'
import { useFinancialPeriodsStore } from '@/stores/financialPeriods'

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
  findAll: store.findAll,
  count: store.count,
  remove: store.remove,
})

const expiredPeriods = computed(() => pageResponse.value.content.filter((period) => period.expired))
const expiredNames = computed(() => expiredPeriods.value.map((period) => period.name).join(', '))

const columns = computed(() => [
  { field: 'name', header: t('financial-period.table-columns.name'), sortable: true },
  { field: 'startingAt', header: t('financial-period.table-columns.starting-at'), mono: true },
  { field: 'endingAt', header: t('financial-period.table-columns.ending-at'), mono: true },
  { field: 'status', header: t('financial-period.table-columns.status'), sortable: true },
])
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
        <AlertTitle>
          {{
            $t(
              'financial-period.list.expired-notice',
              { count: expiredPeriods.length, names: expiredNames },
              expiredPeriods.length,
            )
          }}
        </AlertTitle>
      </Alert>
      <ServerErrorAlert :messages="messages" />
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
        <template #cell-status="{ item }"
          ><PeriodStatusBadge :status="item.status" :expired="item.expired"
        /></template>
        <template #actions="{ item }">
          <ActionButtons
            v-if="item.status === 'OPEN'"
            @on-edit="changeToUpdate(item.id)"
            @on-delete="remove(item)"
          />
        </template>
      </ItemsTable>
    </div>
  </PageContainer>
</template>
