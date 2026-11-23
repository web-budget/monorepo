<script setup lang="ts">
import { ArrowLeftRight, Plus, X } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import ListState, { type ListStateKind } from '@/components/listing/ListState.vue'
import SearchControls from '@/components/listing/SearchControls.vue'
import GiveBackDialog from '@/components/transfers/GiveBackDialog.vue'
import TransferRowActions from '@/components/transfers/TransferRowActions.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useActiveWallets } from '@/composables/useActiveWallets'
import { useGiveBack } from '@/composables/useGiveBack'
import { useListFilters } from '@/composables/useListFilters'
import { useServerErrors } from '@/composables/useServerErrors'
import { TRANSFER_FILTER_KEYS, useTransfersStore } from '@/stores/transfers'
import type { TransferView } from '@/types'

const { t, d, locale } = useI18n()
const router = useRouter()

const store = useTransfersStore()
const { pageRequest, pageResponse, loading, filters } = storeToRefs(store)

const activeWallets = useActiveWallets()
const loadErrors = useServerErrors()
const optionErrors = useServerErrors()
const giveBack = useGiveBack()

const loadFailed = ref(false)
const initializing = ref(true)

const { writeRoute } = useListFilters({
  pageRequest,
  initialStatus: 'ALL',
  statuses: ['ALL'],
  sortFields: ['createdOn', 'value', 'fromWallet', 'toWallet'],
  extra: { keys: TRANSFER_FILTER_KEYS, values: filters },
  onExternalChange: reload,
})

const ready = optionErrors.run(() => activeWallets.load('ALL'))

async function reload() {
  await ready
  writeRoute()
  loadFailed.value = !(await loadErrors.run(store.findAll))
  initializing.value = false
}

onMounted(reload)

const busy = computed(() => loading.value || initializing.value)
const hasFilters = computed(() => TRANSFER_FILTER_KEYS.some((key) => filters.value[key]))
const listState = computed<ListStateKind | 'table'>(() => {
  if (loadFailed.value) {
    return 'error'
  }
  if (busy.value || pageResponse.value.totalElements > 0) {
    return 'table'
  }
  return hasFilters.value || pageRequest.value.filterText !== '' ? 'no-result' : 'empty'
})

const walletChoices = computed(() =>
  activeWallets.wallets.value.map((wallet) => ({ value: wallet.id, label: wallet.name })),
)

const columns = computed(() => [
  { field: 'createdOn', header: t('transfer.table-columns.created-on'), sortable: true },
  { field: 'fromWallet', header: t('transfer.table-columns.from'), sortable: true },
  { field: 'toWallet', header: t('transfer.table-columns.to'), sortable: true },
  {
    field: 'value',
    header: t('transfer.table-columns.value'),
    sortable: true,
    align: 'end' as const,
  },
  { field: 'description', header: t('transfer.table-columns.note') },
  { field: 'status', header: t('transfer.table-columns.status') },
])

function formatDateTime(value: string) {
  const date = new Date(value)
  const time = date.toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })
  return `${d(date, 'short')} ${time}`
}

function search() {
  pageRequest.value.current = 0
  return reload()
}

function changeFilter(key: string, value: string) {
  filters.value = { ...filters.value, [key]: value }
  return search()
}

function clearFilters() {
  filters.value = {}
  return search()
}

function clearSearch() {
  pageRequest.value.filterText = ''
  return search()
}

function onPageChange(event: { currentPage: number; pageSize: number }) {
  pageRequest.value.size = event.pageSize
  pageRequest.value.current = event.currentPage
  return reload()
}

function onTableSorted(event: { sortField: string; sortOrder: 'asc' | 'desc' }) {
  pageRequest.value.sortField = event.sortField
  pageRequest.value.direction = event.sortOrder
  return reload()
}

function openDetail(transfer: { id: string }) {
  return router.push({ name: 'transfers.detail', params: { id: transfer.id } })
}

function create() {
  return router.push({ name: 'transfers.create' })
}

function statusOf(transfer: TransferView) {
  if (transfer.returnedBy) {
    return t('transfer.status.returned')
  }
  return transfer.returnOf
    ? t('transfer.status.return-of', { date: d(new Date(transfer.returnOf.createdOn), 'short') })
    : null
}
</script>

<template>
  <PageContainer class="gap-6">
    <PageHeader :title="$t('transfer.title')" :description="$t('transfer.list.description')">
      <template #actions>
        <Button type="button" @click="create()"><Plus />{{ $t('form.create') }}</Button>
      </template>
    </PageHeader>
    <div class="grid gap-3">
      <SearchControls
        :status="pageRequest.status"
        v-model:filter="pageRequest.filterText"
        :placeholder="$t('transfer.search.placeholder')"
        :status-options="[]"
        @on-filter-change="search()"
        @on-filter-reset="search()"
      />
      <div
        class="grid grid-cols-2 items-end gap-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]"
        data-slot="filters"
      >
        <FilterSelect
          class="col-span-2 lg:col-span-1"
          :label="$t('transfer.filters.wallet')"
          :none-label="$t('transfer.filters.all-wallets')"
          :options="walletChoices"
          :model-value="filters.wallet ?? ''"
          @update:model-value="(value: string) => changeFilter('wallet', value)"
        />
        <div class="grid min-w-0 content-start gap-2">
          <Label for="transfer-from">{{ $t('transfer.filters.from') }}</Label>
          <Input
            id="transfer-from"
            type="date"
            class="font-mono"
            :model-value="filters.from ?? ''"
            @update:model-value="(value) => changeFilter('from', String(value))"
          />
        </div>
        <div class="grid min-w-0 content-start gap-2">
          <Label for="transfer-to">{{ $t('transfer.filters.to') }}</Label>
          <Input
            id="transfer-to"
            type="date"
            class="font-mono"
            :model-value="filters.to ?? ''"
            @update:model-value="(value) => changeFilter('to', String(value))"
          />
        </div>
        <Button type="button" variant="ghost" :disabled="!hasFilters" @click="clearFilters()">
          <X />{{ $t('transfer.filters.clear') }}
        </Button>
      </div>
      <ServerErrorAlert :messages="[...optionErrors.messages.value, ...giveBack.messages.value]" />
      <ListState
        v-if="listState !== 'table'"
        :kind="listState"
        entity="transfer"
        :icon="ArrowLeftRight"
        :query="pageRequest.filterText"
        :message="loadErrors.messages.value[0]"
        @create="create()"
        @clear="clearSearch()"
        @retry="reload()"
      />
      <ItemsTable
        v-else
        :data="pageResponse.content"
        :total-elements="pageResponse.totalElements"
        :columns="columns"
        :show-status="false"
        :loading="busy"
        :current-page="pageRequest.current"
        :page-size="pageRequest.size"
        :sorted-field="pageRequest.sortField"
        :sorted-order="pageRequest.direction"
        detail-route="transfers.detail"
        @page-changed="onPageChange"
        @table-sorted="onTableSorted"
        @row-selected="({ data }) => openDetail(data)"
      >
        <template #cell-createdOn="{ item }">
          <span class="font-mono tabular-nums">{{ formatDateTime(item.createdOn) }}</span>
        </template>
        <template #cell-fromWallet="{ item }">{{ item.fromWallet.name }}</template>
        <template #cell-toWallet="{ item }">{{ item.toWallet.name }}</template>
        <template #cell-value="{ item }">
          <CurrencyDisplay :value="item.value" />
        </template>
        <template #cell-description="{ item }">
          <span class="text-muted-foreground">{{ item.description ?? '—' }}</span>
        </template>
        <template #cell-status="{ item }">
          <Badge v-if="statusOf(item)" variant="neutral">{{ statusOf(item) }}</Badge>
          <span v-else class="text-muted-foreground">—</span>
        </template>
        <template #actions="{ item }">
          <TransferRowActions
            :returnable="item.returnable"
            @details="openDetail(item)"
            @give-back="giveBack.open(item)"
          />
        </template>
      </ItemsTable>
    </div>
    <GiveBackDialog
      :transfer="giveBack.target.value"
      :loading="loading"
      :balance-of="giveBack.balanceOf"
      @close="giveBack.close()"
      @confirm="giveBack.confirm"
    />
  </PageContainer>
</template>
