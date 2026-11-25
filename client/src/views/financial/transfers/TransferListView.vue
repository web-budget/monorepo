<script setup lang="ts">
import { ArrowLeftRight, Plus, Undo2, X } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import ListState, { type ListStateKind } from '@/components/listing/ListState.vue'
import SearchControls from '@/components/listing/SearchControls.vue'
import GiveBackDialog from '@/components/transfers/GiveBackDialog.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useActiveWallets } from '@/composables/useActiveWallets'
import { useGiveBack } from '@/composables/useGiveBack'
import { useListFilters } from '@/composables/useListFilters'
import { useServerErrors } from '@/composables/useServerErrors'
import { TRANSFER_FILTER_KEYS, useTransfersStore } from '@/stores/transfers'

const { t, locale } = useI18n()
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
const listCopy = computed(() => ({
  emptyTitle: t('transfer.list.empty-title'),
  emptyDescription: t('transfer.list.empty-description'),
  errorDescription: t('transfer.list.error-description'),
  noResultQuery: t('transfer.list.no-result-query', { query: pageRequest.value.filterText }),
  noResultFilter: t('transfer.list.no-result-filter'),
  noResultHint: t('transfer.list.no-result-hint'),
  noResultAction: t('transfer.list.no-result-action'),
}))

const walletChoices = computed(() =>
  activeWallets.wallets.value.map((wallet) => ({ value: wallet.id, label: wallet.name })),
)

const columns = computed(() => [
  {
    field: 'createdOn',
    header: t('transfer.table-columns.created-on'),
    sortable: true,
    mobile: 'line' as const,
    mobileLabel: false,
  },
  {
    field: 'fromWallet',
    header: t('transfer.table-columns.from'),
    sortable: true,
    mobile: 'title' as const,
  },
  {
    field: 'toWallet',
    header: t('transfer.table-columns.to'),
    sortable: true,
    mobile: 'hide' as const,
  },
  {
    field: 'value',
    header: t('transfer.table-columns.value'),
    sortable: true,
    align: 'end' as const,
    mobile: 'value' as const,
  },
  {
    field: 'description',
    header: t('transfer.table-columns.note'),
    mobile: 'line' as const,
    mobileLabel: false,
  },
  {
    field: 'status',
    header: t('transfer.table-columns.status'),
    mobile: 'line' as const,
    mobileLabel: false,
  },
])

function shortDay(value: string) {
  return new Date(value).toLocaleDateString(locale.value, { day: '2-digit', month: '2-digit' })
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
</script>

<template>
  <PageContainer class="gap-6">
    <PageHeader :title="$t('transfer.title')" :description="$t('transfer.list.description')">
      <template #actions>
        <Button type="button" @click="create()"><Plus />{{ $t('form.create') }}</Button>
      </template>
    </PageHeader>
    <div class="grid gap-4">
      <Card class="grid gap-4 p-4" data-slot="filter-card">
        <SearchControls
          :status="pageRequest.status"
          v-model:filter="pageRequest.filterText"
          :placeholder="$t('transfer.search.placeholder')"
          :status-options="[]"
          @on-filter-change="search()"
          @on-filter-reset="search()"
        />
        <div
          class="border-border grid grid-cols-2 items-end gap-3 border-t pt-4 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]"
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
      </Card>
      <ServerErrorAlert :messages="optionErrors.messages.value" />
      <ListState
        v-if="listState !== 'table'"
        :kind="listState"
        entity="transfer"
        :icon="ArrowLeftRight"
        :query="pageRequest.filterText"
        :message="loadErrors.messages.value[0]"
        :copy="listCopy"
        @create="create()"
        @clear="clearSearch()"
        @retry="reload()"
      />
      <ItemsTable
        v-else
        active-sort-icon-only
        :status-sortable="false"
        :data="pageResponse.content"
        :total-elements="pageResponse.totalElements"
        :noun="$t('transfer.list.noun', pageResponse.totalElements)"
        :columns="columns"
        :show-status="false"
        :loading="busy"
        :current-page="pageRequest.current"
        :page-size="pageRequest.size"
        :sorted-field="pageRequest.sortField"
        :sorted-order="pageRequest.direction"
        @page-changed="onPageChange"
        @table-sorted="onTableSorted"
        @row-selected="({ data }) => openDetail(data)"
      >
        <template #cell-createdOn="{ item }">
          <DateTimeDisplay with-time class="font-mono tabular-nums" :value="item.createdOn" />
        </template>
        <template #cell-fromWallet="{ item, compact }">
          <template v-if="compact">{{ item.fromWallet.name }} → {{ item.toWallet.name }}</template>
          <template v-else>{{ item.fromWallet.name }}</template>
        </template>
        <template #cell-toWallet="{ item }">{{ item.toWallet.name }}</template>
        <template #cell-value="{ item }">
          <CurrencyDisplay :value="item.value" bare />
        </template>
        <template #cell-description="{ item }">{{ item.description ?? '—' }}</template>
        <template #cell-status="{ item }">
          <Badge v-if="item.returnedBy" variant="neutral">
            <Undo2 />{{ $t('transfer.status.returned') }}
          </Badge>
          <Badge v-else-if="item.returnOf" variant="outline">
            {{ $t('transfer.status.return-of', { date: shortDay(item.returnOf!.createdOn) }) }}
          </Badge>
          <span v-else class="text-muted-foreground">—</span>
        </template>
        <template #actions="{ item }">
          <Button
            v-if="item.returnable"
            type="button"
            variant="outline"
            size="sm"
            @click="giveBack.open(item)"
          >
            <Undo2 />{{ $t('transfer.actions.give-back') }}
          </Button>
        </template>
      </ItemsTable>
    </div>
    <GiveBackDialog
      :transfer="giveBack.target.value"
      :loading="loading"
      :balance-of="giveBack.balanceOf"
      :messages="giveBack.messages.value"
      @close="giveBack.close()"
      @confirm="giveBack.confirm"
    />
  </PageContainer>
</template>
