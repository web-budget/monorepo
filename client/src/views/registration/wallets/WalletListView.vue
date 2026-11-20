<script setup lang="ts">
import { Plus, Wallet } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
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
import { useWalletsStore } from '@/stores/wallets'
import { typeKey } from '@/utils/typeLabels'

const { t } = useI18n()

const store = useWalletsStore()
const { pageRequest, pageResponse, loading } = storeToRefs(store)

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
  routeName: 'wallets',
  entity: 'wallet',
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
  { field: 'name', header: t('wallet.table-columns.name'), sortable: true },
  { field: 'type', header: t('wallet.table-columns.type'), sortable: true },
  { field: 'bank', header: t('wallet.table-columns.bank'), sortable: true },
])
</script>

<template>
  <PageContainer>
    <PageHeader :title="$t('wallet.title')" :description="$t('wallet.list.description')">
      <template #actions>
        <Button type="button" @click="changeToAdd()"><Plus />{{ $t('wallet.form.new') }}</Button>
      </template>
    </PageHeader>
    <div class="grid gap-3">
      <SearchControls
        v-model:status="pageRequest.status"
        v-model:filter="pageRequest.filterText"
        :placeholder="$t('wallet.search.placeholder')"
        :status-options="FEMININE_STATUS_OPTIONS"
        :counts="counts"
        @on-filter-change="search()"
        @on-filter-reset="search()"
      />
      <ServerErrorAlert :messages="messages" />
      <ListState
        v-if="listState !== 'table'"
        :kind="listState"
        entity="wallet"
        :icon="Wallet"
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
        :loading="busy"
        :current-page="pageRequest.current"
        :page-size="pageRequest.size"
        detail-route="wallets.detail"
        @page-changed="onPageChange"
        @table-sorted="onTableSorted"
        @row-selected="changeToDetail"
      >
        <template #cell-bank="{ item }">
          {{ item.type === 'PERSONAL' ? '---' : item.bank }}
        </template>
        <template #cell-type="{ item }">{{ $t(typeKey('wallet', item.type)) }}</template>
        <template #actions="{ item }">
          <ActionButtons @on-edit="changeToUpdate(item.id)" @on-delete="remove(item)" />
        </template>
      </ItemsTable>
    </div>
  </PageContainer>
</template>
