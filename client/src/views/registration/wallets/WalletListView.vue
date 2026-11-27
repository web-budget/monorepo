<script setup lang="ts">
import { Plus, Wallet } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import ListState from '@/components/listing/ListState.vue'
import SearchControls from '@/components/listing/SearchControls.vue'
import { FEMININE_STATUS_OPTIONS } from '@/components/listing/statusOptions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import AdjustBalanceDialog from '@/components/wallets/AdjustBalanceDialog.vue'
import WalletRowActions from '@/components/wallets/WalletRowActions.vue'
import { useCrudList } from '@/composables/useCrudList'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { useStatementStore } from '@/stores/statement'
import { useWalletsStore } from '@/stores/wallets'
import type { WalletListView } from '@/types'
import { adjustmentNotice } from '@/utils/statement'
import { typeKey } from '@/utils/typeLabels'

const { t, n } = useI18n()
const router = useRouter()

const store = useWalletsStore()
const { pageRequest, pageResponse, loading } = storeToRefs(store)

const statement = useStatementStore()
const { showSuccess } = useNotification()
const adjustErrors = useServerErrors()
const adjusting = ref<WalletListView | null>(null)

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
  sortFields: ['name', 'type', 'totalBalance', 'currentBalance'],
  pageRequest,
  pageResponse,
  loading,
  findAll: store.findAll,
  count: store.count,
  remove: store.remove,
})

const listCopy = computed(() => ({
  emptyTitle: t('wallet.list.empty-title'),
  emptyDescription: t('wallet.list.empty-description'),
  errorDescription: t('wallet.list.error-description'),
  noResultQuery: t('wallet.list.no-result-query', { query: pageRequest.value.filterText }),
  noResultFilter: t('wallet.list.no-result-filter'),
  noResultHint: t('wallet.list.no-result-hint'),
  noResultAction: t('wallet.list.no-result-action'),
}))

const columns = computed(() => [
  {
    field: 'name',
    header: t('wallet.table-columns.name'),
    sortable: true,
    mobile: 'title' as const,
  },
  {
    field: 'type',
    header: t('wallet.table-columns.type'),
    sortable: true,
    mobile: 'line' as const,
    mobileLabel: false,
  },
  {
    field: 'bank',
    header: t('wallet.table-columns.bank'),
    mobile: 'line' as const,
    mobileLabel: false,
  },
  {
    field: 'agency',
    header: t('wallet.table-columns.agency-number'),
    mobile: 'line' as const,
    mobileLabel: false,
  },
  {
    field: 'totalBalance',
    header: t('wallet.table-columns.total'),
    sortable: true,
    align: 'end' as const,
    mobile: 'value' as const,
  },
  {
    field: 'currentBalance',
    header: t('wallet.table-columns.free'),
    sortable: true,
    align: 'end' as const,
    mobile: 'line' as const,
  },
])

function agencyAndNumber(wallet: WalletListView) {
  return [wallet.agency, wallet.number].filter(Boolean).join(' / ') || '—'
}

function openStatement(wallet: WalletListView) {
  return router.push({ path: '/financial/statement', query: { wallet: wallet.id } })
}

function openAdjust(wallet: WalletListView) {
  adjustErrors.clear()
  adjusting.value = wallet
}

function closeAdjust() {
  adjusting.value = null
}

async function adjust(target: { id: string }, form: { value: number }) {
  if (await adjustErrors.run(() => statement.adjust(target.id, form))) {
    const wallet = adjusting.value
    adjusting.value = null
    const notice = adjustmentNotice(form.value, wallet?.name, n)
    showSuccess('statement.toast.adjusted', notice.detail, true, notice.params)
    await reload()
  }
}
</script>

<template>
  <PageContainer class="gap-6">
    <PageHeader :title="$t('wallet.title')" :description="$t('wallet.list.description')">
      <template #actions>
        <Button type="button" @click="changeToAdd()"><Plus />{{ $t('form.create') }}</Button>
      </template>
    </PageHeader>
    <div class="grid gap-4">
      <Card class="p-4" data-slot="filter-card">
        <SearchControls
          v-model:status="pageRequest.status"
          v-model:filter="pageRequest.filterText"
          :placeholder="$t('wallet.search.placeholder')"
          :status-options="FEMININE_STATUS_OPTIONS"
          :counts="counts"
          @on-filter-change="search()"
          @on-filter-reset="search()"
        />
      </Card>
      <ServerErrorAlert :messages="messages" />
      <ListState
        v-if="listState !== 'table'"
        :kind="listState"
        entity="wallet"
        :icon="Wallet"
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
        :status-sortable="false"
        :data="pageResponse.content"
        :total-elements="pageResponse.totalElements"
        feminine-status
        :summary="searchSummary"
        :noun="$t('wallet.list.noun', pageResponse.totalElements)"
        :columns="columns"
        :loading="busy"
        :current-page="pageRequest.current"
        :page-size="pageRequest.size"
        :sorted-field="pageRequest.sortField"
        :sorted-order="pageRequest.direction"
        detail-route="wallets.detail"
        @page-changed="onPageChange"
        @table-sorted="onTableSorted"
        @row-selected="changeToDetail"
      >
        <template #cell-type="{ item }">{{ $t(typeKey('wallet', item.type)) }}</template>
        <template #cell-bank="{ item }">{{ item.bank || '—' }}</template>
        <template #cell-agency="{ item }">
          <span class="text-muted-foreground font-mono">{{ agencyAndNumber(item) }}</span>
        </template>
        <template #cell-totalBalance="{ item }">
          <CurrencyDisplay :value="item.totalBalance" :signed="item.totalBalance < 0" bare glued />
        </template>
        <template #cell-currentBalance="{ item }">
          <CurrencyDisplay
            :value="item.currentBalance"
            :signed="item.currentBalance < 0"
            bare
            glued
          />
        </template>
        <template #actions="{ item }">
          <WalletRowActions
            :adjustable="item.active"
            @statement="openStatement(item)"
            @adjust="openAdjust(item)"
            @edit="changeToUpdate(item.id)"
            @remove="remove(item)"
          />
        </template>
      </ItemsTable>
    </div>
    <AdjustBalanceDialog
      :wallet="
        adjusting
          ? { id: adjusting.id, name: adjusting.name, balance: adjusting.currentBalance }
          : null
      "
      :loading="statement.loading"
      :messages="adjustErrors.messages.value"
      @close="closeAdjust()"
      @adjust="adjust"
    />
  </PageContainer>
</template>
