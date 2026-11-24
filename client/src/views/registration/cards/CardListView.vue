<script setup lang="ts">
import { CreditCard, Plus } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import CardRowActions from '@/components/cards/CardRowActions.vue'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import ListState from '@/components/listing/ListState.vue'
import SearchControls from '@/components/listing/SearchControls.vue'
import StatusBadge from '@/components/listing/StatusBadge.vue'
import { MASCULINE_STATUS_OPTIONS } from '@/components/listing/statusOptions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useCrudList } from '@/composables/useCrudList'
import { useCardsStore } from '@/stores/cards'
import type { CardListView, StatusFilter } from '@/types'

const { t } = useI18n()
const router = useRouter()

const store = useCardsStore()
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
  routeName: 'cards',
  entity: 'card',
  initialStatus: 'ACTIVE',
  statuses: MASCULINE_STATUS_OPTIONS.map((option) => option.value),
  sortFields: ['name', 'invoicePaymentDay'],
  countsFollowFilters: true,
  pageRequest,
  pageResponse,
  loading,
  findAll: store.findAll,
  count: (status: StatusFilter) => store.count(status, true),
  remove: store.remove,
})

const columns = computed(() => [
  {
    field: 'name',
    header: t('card.table-columns.name'),
    sortable: true,
    mobile: 'title' as const,
  },
  {
    field: 'lastFourDigits',
    header: t('card.table-columns.last-digits'),
    mobile: 'line' as const,
  },
  {
    field: 'flag',
    header: t('card.table-columns.flag'),
    mobile: 'line' as const,
    mobileLabel: false,
  },
  {
    field: 'invoicePaymentDay',
    header: t('card.table-columns.invoice-payment-day'),
    sortable: true,
    align: 'end' as const,
    mono: true,
    mobile: 'line' as const,
  },
  {
    field: 'wallet',
    header: t('card.table-columns.wallet'),
    mobile: 'line' as const,
    mobileLabel: false,
  },
  {
    field: 'status',
    header: t('card.table-columns.status'),
    mobile: 'value' as const,
  },
])

const listCopy = computed(() => ({
  noResultQuery: t('card.list.no-result-query', { query: pageRequest.value.filterText }),
  noResultFilter: t('card.list.no-result-filter'),
  noResultHint: t('card.list.no-result-hint'),
  noResultAction: t('card.list.no-result-action'),
  errorDescription: t('card.list.error-description'),
}))

function viewInvoices(card: CardListView) {
  return router.push({ name: 'invoices', query: { card: card.id } })
}
</script>

<template>
  <PageContainer class="gap-6">
    <PageHeader :title="$t('card.title')" :description="$t('card.list.description')">
      <template #actions>
        <Button type="button" @click="changeToAdd()"><Plus />{{ $t('form.create') }}</Button>
      </template>
    </PageHeader>
    <div class="grid gap-4">
      <Card class="p-4">
        <SearchControls
          v-model:status="pageRequest.status"
          v-model:filter="pageRequest.filterText"
          :placeholder="$t('card.search.placeholder')"
          :status-options="MASCULINE_STATUS_OPTIONS"
          :counts="counts"
          @on-filter-change="search()"
          @on-filter-reset="search()"
        />
      </Card>
      <ServerErrorAlert :messages="messages" />
      <ListState
        v-if="listState !== 'table'"
        :kind="listState"
        entity="card"
        :icon="CreditCard"
        :query="pageRequest.filterText"
        :message="loadMessages[0]"
        :copy="listCopy"
        @create="changeToAdd()"
        @clear="clearSearch()"
        @retry="reload()"
      />
      <ItemsTable
        v-else
        active-sort-icon-only
        :data="pageResponse.content"
        :total-elements="pageResponse.totalElements"
        :summary="searchSummary"
        :noun="$t('card.list.noun', pageResponse.totalElements)"
        :columns="columns"
        :show-status="false"
        :loading="busy"
        :current-page="pageRequest.current"
        :page-size="pageRequest.size"
        :sorted-field="pageRequest.sortField"
        :sorted-order="pageRequest.direction"
        detail-route="cards.detail"
        @page-changed="onPageChange"
        @table-sorted="onTableSorted"
        @row-selected="changeToDetail"
      >
        <template #cell-lastFourDigits="{ item }">
          <span class="font-mono tabular-nums">••{{ item.lastFourDigits }}</span>
        </template>
        <template #cell-wallet="{ item }">{{ item.wallet?.name }}</template>
        <template #cell-status="{ item }"><StatusBadge :active="item.active" /></template>
        <template #actions="{ item }">
          <CardRowActions
            @edit="changeToUpdate(item.id)"
            @invoices="viewInvoices(item)"
            @remove="remove(item)"
          />
        </template>
      </ItemsTable>
    </div>
  </PageContainer>
</template>
