<script setup lang="ts">
import { Plus, Tags } from 'lucide-vue-next'
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
import { FEMININE_STATUS_OPTIONS } from '@/components/listing/statusOptions'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/composables/useCrudList'
import { useClassificationsStore } from '@/stores/classifications'
import { typeKey } from '@/utils/typeLabels'

const { t } = useI18n()

const store = useClassificationsStore()
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
  routeName: 'classifications',
  entity: 'classification',
  initialStatus: 'ACTIVE',
  statuses: FEMININE_STATUS_OPTIONS.map((option) => option.value),
  pageRequest,
  pageResponse,
  loading,
  findAll: store.findAll,
  count: store.count,
  remove: store.remove,
})

const columns = computed(() => [
  { field: 'name', header: t('classification.table-columns.name'), sortable: true },
  { field: 'type', header: t('classification.table-columns.type'), sortable: true },
  {
    field: 'budget',
    header: t('classification.table-columns.budget'),
    sortable: true,
    align: 'end' as const,
  },
])
</script>

<template>
  <PageContainer class="mt-4 grid gap-5">
    <PageHeader
      :title="$t('classification.title')"
      :description="$t('classification.list.description')"
    >
      <template #actions>
        <Button type="button" @click="changeToAdd()">
          <Plus />{{ $t('classification.form.new') }}
        </Button>
      </template>
    </PageHeader>
    <div class="grid gap-3">
      <SearchControls
        v-model:status="pageRequest.status"
        v-model:filter="pageRequest.filterText"
        :placeholder="$t('classification.search.placeholder')"
        :status-options="FEMININE_STATUS_OPTIONS"
        :counts="counts"
        @on-filter-change="search()"
        @on-filter-reset="search()"
      />
      <ServerErrorAlert :messages="messages" />
      <ListState
        v-if="listState !== 'table'"
        :kind="listState"
        entity="classification"
        :icon="Tags"
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
        detail-route="classifications.detail"
        @page-changed="onPageChange"
        @table-sorted="onTableSorted"
        @row-selected="changeToDetail"
      >
        <template #cell-type="{ item }">{{ $t(typeKey('classification', item.type)) }}</template>
        <template #cell-budget="{ item }"><CurrencyDisplay :value="item.budget" /></template>
        <template #actions="{ item }">
          <ActionButtons @on-edit="changeToUpdate(item.id)" @on-delete="remove(item)" />
        </template>
      </ItemsTable>
    </div>
  </PageContainer>
</template>
