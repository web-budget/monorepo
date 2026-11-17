<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ActionButtons from '@/components/listing/ActionButtons.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import SearchControls from '@/components/listing/SearchControls.vue'
import { Card, CardContent } from '@/components/ui/card'
import { useCrudList } from '@/composables/useCrudList'
import { useWalletsStore } from '@/stores/wallets'
import { typeKey } from '@/utils/typeLabels'

const { t } = useI18n()

const store = useWalletsStore()
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
  routeName: 'wallets',
  deletedNotice: 'notification.wallet.deleted',
  pageRequest,
  findAll: store.findAll,
  remove: store.remove,
})

const columns = computed(() => [
  { field: 'name', header: t('wallet.table-columns.name'), sortable: true },
  { field: 'bank', header: t('wallet.table-columns.bank'), sortable: true },
  { field: 'type', header: t('wallet.table-columns.type'), sortable: true },
])
</script>

<template>
  <Card>
    <CardContent class="space-y-6">
      <SearchControls
        v-model:status="pageRequest.status"
        v-model:filter="pageRequest.filterText"
        :placeholder="$t('wallet.search.placeholder')"
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
        <template #cell-bank="{ item }">
          {{ item.type === 'PERSONAL' ? '---' : item.bank }}
        </template>
        <template #cell-type="{ item }">{{ $t(typeKey('wallet', item.type)) }}</template>
        <template #actions="{ item }">
          <ActionButtons @on-edit="changeToUpdate(item.id)" @on-delete="remove(item.id)" />
        </template>
      </ItemsTable>
    </CardContent>
  </Card>
</template>
