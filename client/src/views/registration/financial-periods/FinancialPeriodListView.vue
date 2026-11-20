<script setup lang="ts">
import { CalendarRange, Plus } from 'lucide-vue-next'
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
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/composables/useCrudList'
import { useFinancialPeriodsStore } from '@/stores/financialPeriods'

const { t } = useI18n()

const store = useFinancialPeriodsStore()
const { pageRequest, pageResponse, loading } = storeToRefs(store)

const statusOptions = [
  { label: 'financial-period.options.open', value: 'OPEN' },
  { label: 'financial-period.options.accounted', value: 'ACCOUNTED' },
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
  statuses: ['OPEN', 'ACCOUNTED', 'ALL'],
  pageRequest,
  pageResponse,
  loading,
  findAll: store.findAll,
  count: store.count,
  remove: store.remove,
})

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
        <Button type="button" @click="changeToAdd()">
          <Plus />{{ $t('financial-period.form.new') }}
        </Button>
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
        :loading="busy"
        :current-page="pageRequest.current"
        :page-size="pageRequest.size"
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
        <template #cell-status="{ item }"><PeriodStatusBadge :status="item.status" /></template>
        <template #actions="{ item }">
          <ActionButtons @on-edit="changeToUpdate(item.id)" @on-delete="remove(item)" />
        </template>
      </ItemsTable>
    </div>
  </PageContainer>
</template>
