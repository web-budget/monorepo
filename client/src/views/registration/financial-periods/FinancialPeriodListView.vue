<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ActionButtons from '@/components/listing/ActionButtons.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import PeriodStatusBadge from '@/components/listing/PeriodStatusBadge.vue'
import SearchControls from '@/components/listing/SearchControls.vue'
import { Card, CardContent } from '@/components/ui/card'
import { useCrudList } from '@/composables/useCrudList'
import { useFinancialPeriodsStore } from '@/stores/financialPeriods'

const { t } = useI18n()

const store = useFinancialPeriodsStore()
const { pageRequest, pageResponse, loading } = storeToRefs(store)

const {
  messages,
  reload,
  onPageChange,
  onTableSorted,
  changeToAdd,
  changeToUpdate,
  changeToDetail,
  remove,
} = useCrudList({
  routeName: 'financial-periods',
  deletedNotice: 'notification.financial-period.deleted',
  pageRequest,
  findAll: store.findAll,
  remove: store.remove,
})

const statusOptions = [
  { label: 'financial-period.options.all', value: 'ALL' },
  { label: 'financial-period.options.accounted', value: 'ACCOUNTED' },
  { label: 'financial-period.options.open', value: 'OPEN' },
]

const columns = computed(() => [
  {
    field: 'status',
    header: t('financial-period.table-columns.status'),
    sortable: true,
    class: 'w-[13%]',
  },
  { field: 'name', header: t('financial-period.table-columns.name'), sortable: true },
  {
    field: 'startingAt',
    header: t('financial-period.table-columns.starting-at'),
    class: 'w-[15%]',
  },
  { field: 'endingAt', header: t('financial-period.table-columns.ending-at'), class: 'w-[15%]' },
])
</script>

<template>
  <Card>
    <CardContent class="space-y-6">
      <SearchControls
        v-model:status="pageRequest.status"
        v-model:filter="pageRequest.filterText"
        status-initial-value="OPEN"
        :status-options="statusOptions"
        :placeholder="$t('financial-period.search.placeholder')"
        @on-new="changeToAdd()"
        @on-filter-change="reload()"
        @on-filter-reset="reload()"
      />
      <ServerErrorAlert :messages="messages" />
      <ItemsTable
        :data="pageResponse.content"
        :total-elements="pageResponse.totalElements"
        :columns="columns"
        :show-status="false"
        :loading="loading"
        :current-page="pageRequest.current"
        :page-size="pageRequest.size"
        @page-changed="onPageChange"
        @table-sorted="onTableSorted"
        @row-selected="changeToDetail"
      >
        <template #cell-status="{ item }"><PeriodStatusBadge :status="item.status" /></template>
        <template #cell-startingAt="{ item }">
          <DateTimeDisplay fix-time :value="item.startingAt" />
        </template>
        <template #cell-endingAt="{ item }">
          <DateTimeDisplay fix-time :value="item.endingAt" />
        </template>
        <template #actions="{ item }">
          <ActionButtons @on-edit="changeToUpdate(item.id)" @on-delete="remove(item.id)" />
        </template>
      </ItemsTable>
    </CardContent>
  </Card>
</template>
