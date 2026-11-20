<script setup lang="ts">
import { Network, Plus } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ActionButtons from '@/components/listing/ActionButtons.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import ListState from '@/components/listing/ListState.vue'
import SearchControls from '@/components/listing/SearchControls.vue'
import { MASCULINE_STATUS_OPTIONS } from '@/components/listing/statusOptions'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/composables/useCrudList'
import { useCostCentersStore } from '@/stores/costCenters'

const { t } = useI18n()

const store = useCostCentersStore()
const { pageRequest, pageResponse, loading } = storeToRefs(store)

const {
  messages,
  loadMessages,
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
  routeName: 'cost-centers',
  entity: 'cost-center',
  initialStatus: 'ACTIVE',
  statuses: MASCULINE_STATUS_OPTIONS.map((option) => option.value),
  pageRequest,
  pageResponse,
  loading,
  findAll: store.findAll,
  count: store.count,
  remove: store.remove,
})

const columns = computed(() => [
  { field: 'fullName', header: t('cost-center.table-columns.full-name'), sortable: true },
  {
    field: 'incomeBudget',
    header: t('cost-center.table-columns.income-budget'),
    align: 'end' as const,
  },
  {
    field: 'expenseBudget',
    header: t('cost-center.table-columns.expense-budget'),
    align: 'end' as const,
  },
])
</script>

<template>
  <PageContainer>
    <PageHeader :title="$t('cost-center.title')" :description="$t('cost-center.list.description')">
      <template #actions>
        <Button type="button" @click="changeToAdd()">
          <Plus />{{ $t('cost-center.form.new') }}
        </Button>
      </template>
    </PageHeader>
    <div class="grid gap-3">
      <SearchControls
        v-model:status="pageRequest.status"
        v-model:filter="pageRequest.filterText"
        :placeholder="$t('cost-center.search.placeholder')"
        :status-options="MASCULINE_STATUS_OPTIONS"
        :counts="counts"
        @on-filter-change="search()"
        @on-filter-reset="search()"
      />
      <ServerErrorAlert :messages="messages" />
      <ListState
        v-if="listState !== 'table'"
        :kind="listState"
        entity="cost-center"
        :icon="Network"
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
        :columns="columns"
        :loading="busy"
        :current-page="pageRequest.current"
        :page-size="pageRequest.size"
        detail-route="cost-centers.detail"
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
          <ActionButtons @on-edit="changeToUpdate(item.id)" @on-delete="remove(item)" />
        </template>
      </ItemsTable>
    </div>
  </PageContainer>
</template>
