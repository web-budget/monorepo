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
import { useClassificationsStore } from '@/stores/classifications'
import { typeKey } from '@/utils/typeLabels'

const { t } = useI18n()

const store = useClassificationsStore()
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
  routeName: 'classifications',
  deletedNotice: 'notification.classification.deleted',
  pageRequest,
  findAll: store.findAll,
  remove: store.remove,
})

const columns = computed(() => [
  { field: 'name', header: t('classification.table-columns.name'), sortable: true },
  { field: 'type', header: t('classification.table-columns.type'), sortable: true },
  {
    field: 'budget',
    header: t('classification.table-columns.budget'),
    sortable: true,
    class: 'w-[20%]',
  },
])
</script>

<template>
  <Card>
    <CardContent class="space-y-6">
      <SearchControls
        v-model:status="pageRequest.status"
        v-model:filter="pageRequest.filterText"
        :placeholder="$t('classification.search.placeholder')"
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
        <template #cell-type="{ item }">{{ $t(typeKey('classification', item.type)) }}</template>
        <template #cell-budget="{ item }"><CurrencyDisplay :value="item.budget" /></template>
        <template #actions="{ item }">
          <ActionButtons @on-edit="changeToUpdate(item.id)" @on-delete="remove(item.id)" />
        </template>
      </ItemsTable>
    </CardContent>
  </Card>
</template>
