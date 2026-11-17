<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ActionButtons from '@/components/listing/ActionButtons.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import SearchControls from '@/components/listing/SearchControls.vue'
import { Card, CardContent } from '@/components/ui/card'
import { useCrudList } from '@/composables/useCrudList'
import { useCostCentersStore } from '@/stores/costCenters'

const { t } = useI18n()

const store = useCostCentersStore()
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
  routeName: 'cost-centers',
  deletedNotice: 'notification.cost-center.deleted',
  pageRequest,
  findAll: store.findAll,
  remove: store.remove,
})

const columns = computed(() => [
  { field: 'fullName', header: t('cost-center.table-columns.full-name'), sortable: true },
  {
    field: 'incomeBudget',
    header: t('cost-center.table-columns.income-budget'),
    class: 'w-[15%]',
  },
  {
    field: 'expenseBudget',
    header: t('cost-center.table-columns.expense-budget'),
    class: 'w-[15%]',
  },
])
</script>

<template>
  <Card>
    <CardContent class="space-y-6">
      <SearchControls
        v-model:status="pageRequest.status"
        v-model:filter="pageRequest.filterText"
        :placeholder="$t('cost-center.search.placeholder')"
        @on-new="changeToAdd()"
        @on-filter-change="reload()"
        @on-filter-reset="reload()"
      />
      <ServerErrorAlert :messages="messages" />
      <ItemsTable
        :data="pageResponse.content"
        :total-elements="pageResponse.totalElements"
        :columns="columns"
        :loading="loading"
        :current-page="pageRequest.current"
        :page-size="pageRequest.size"
        @page-changed="onPageChange"
        @table-sorted="onTableSorted"
        @row-selected="changeToDetail"
      >
        <template #cell-incomeBudget="{ item }">
          <CurrencyDisplay :value="item.incomeBudget" />
        </template>
        <template #cell-expenseBudget="{ item }">
          <CurrencyDisplay :value="item.expenseBudget" />
        </template>
        <template #actions="{ item }">
          <ActionButtons @on-edit="changeToUpdate(item.id)" @on-delete="remove(item.id)" />
        </template>
      </ItemsTable>
    </CardContent>
  </Card>
</template>
