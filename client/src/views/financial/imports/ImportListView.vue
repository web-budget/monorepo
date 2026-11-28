<script setup lang="ts">
import { FileUp, Plus, X } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { financialPeriodsApi } from '@/api/financialPeriods'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ImportDestination from '@/components/imports/ImportDestination.vue'
import ImportStatusBadge from '@/components/imports/ImportStatusBadge.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import ListState, { type ListStateKind } from '@/components/listing/ListState.vue'
import SearchControls from '@/components/listing/SearchControls.vue'
import type { StatusOption } from '@/components/listing/statusOptions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useActiveCards } from '@/composables/useActiveCards'
import { useActiveWallets } from '@/composables/useActiveWallets'
import { useListFilters } from '@/composables/useListFilters'
import { useServerErrors } from '@/composables/useServerErrors'
import { IMPORT_FILTER_KEYS, IMPORT_STATUSES, useImportsStore } from '@/stores/imports'
import type { FinancialPeriodListView, ImportListView, ImportStatusFilter } from '@/types'
import { cardLabel } from '@/utils/invoices'
import { destinationValue } from '@/utils/imports'

const OPTIONS_PAGE_SIZE = 100

const { t } = useI18n()
const router = useRouter()

const store = useImportsStore()
const { pageRequest, pageResponse, loading, filters, counts } = storeToRefs(store)

const loadErrors = useServerErrors()
const optionErrors = useServerErrors()
const activeCards = useActiveCards()
const activeWallets = useActiveWallets()

const periods = ref<FinancialPeriodListView[]>([])
const loadFailed = ref(false)
const initializing = ref(true)

const statusOptions: StatusOption<ImportStatusFilter>[] = [
  { label: 'imports.status-tabs.READY', value: 'READY' },
  { label: 'imports.status-tabs.PROCESSING', value: 'PROCESSING' },
  { label: 'imports.status-tabs.FAILED', value: 'FAILED' },
  { label: 'imports.status-tabs.SAVED', value: 'SAVED' },
  { label: 'imports.status-tabs.UNDONE', value: 'UNDONE' },
  { label: 'search-control.feminine.all', value: 'ALL' },
]

const { writeRoute } = useListFilters({
  pageRequest,
  initialStatus: 'READY',
  statuses: IMPORT_STATUSES,
  sortFields: ['name', 'period', 'createdOn'],
  extra: { keys: IMPORT_FILTER_KEYS, values: filters },
  onExternalChange: reload,
})

const ready = optionErrors.run(async () => {
  const periodPage = await financialPeriodsApi.findAll({ status: 'ALL', size: OPTIONS_PAGE_SIZE })
  periods.value = periodPage.content
  await Promise.all([activeCards.load(), activeWallets.load()])
})

async function reload() {
  await ready
  writeRoute()
  loadFailed.value = !(await loadErrors.run(store.findAll))
  initializing.value = false
  void store.loadCounts()
}

onMounted(reload)

const statusCounts = computed(() =>
  counts.value === null
    ? {}
    : {
        READY: counts.value.ready,
        PROCESSING: counts.value.processing,
        FAILED: counts.value.failed,
        SAVED: counts.value.saved,
        UNDONE: counts.value.undone,
        ALL: counts.value.total,
      },
)

const busy = computed(() => loading.value || initializing.value)
const narrowed = computed(
  () =>
    Boolean(filters.value.destination) ||
    Boolean(filters.value.period) ||
    Boolean(pageRequest.value.filterText),
)
const listState = computed<ListStateKind | 'table'>(() => {
  if (loadFailed.value) {
    return 'error'
  }
  if (busy.value || pageResponse.value.totalElements > 0) {
    return 'table'
  }
  return !narrowed.value && counts.value?.total === 0 ? 'empty' : 'no-result'
})

const destinationChoices = computed(() => [
  ...activeCards.cards.value.map((card) => ({
    value: destinationValue('CARD', card.id),
    label: cardLabel(card),
  })),
  ...activeWallets.wallets.value
    .filter((wallet) => wallet.type !== 'PERSONAL')
    .map((wallet) => ({ value: destinationValue('WALLET', wallet.id), label: wallet.name })),
])
const periodChoices = computed(() =>
  periods.value.map((period) => ({
    value: period.id,
    label:
      period.status === 'CLOSED' ? t('imports.filters.closed', { name: period.name }) : period.name,
  })),
)
const filtersActive = computed(
  () => Boolean(filters.value.destination) || Boolean(filters.value.period),
)

const columns = computed(() => [
  {
    field: 'name',
    header: t('imports.columns.file'),
    sortable: true,
    mobile: 'title' as const,
    class: 'whitespace-normal',
  },
  {
    field: 'destination',
    header: t('imports.columns.destination'),
    mobile: 'line' as const,
    mobileLabel: false,
  },
  {
    field: 'period',
    header: t('imports.columns.period'),
    sortable: true,
    mobile: 'line' as const,
    mobileLabel: false,
  },
  { field: 'lines', header: t('imports.columns.lines'), mobile: 'line' as const },
  {
    field: 'createdOn',
    header: t('imports.columns.sent-on'),
    sortable: true,
    mobile: 'line' as const,
    mobileLabel: false,
  },
  {
    field: 'status',
    header: t('imports.columns.status'),
    mobile: 'value' as const,
  },
])

const listCopy = computed(() => {
  const copy = {
    emptyTitle: t('imports.list.empty-title'),
    emptyDescription: t('imports.list.empty-description'),
    errorDescription: t('imports.list.error-description'),
    noResultQuery: t('imports.list.no-result-query', { query: pageRequest.value.filterText }),
    noResultFilter: t('imports.list.no-result-filter'),
    noResultHint: t('imports.list.no-result-hint'),
    noResultAction: t('imports.list.no-result-action'),
  }
  const status = pageRequest.value.status
  if (narrowed.value || status === 'ALL') {
    return copy
  }
  return {
    ...copy,
    noResultFilter: t(`imports.list.empty-tab.${status}`),
    noResultHint: '',
    noResultAction: t('imports.list.show-all'),
  }
})

function search() {
  pageRequest.value.current = 0
  return reload()
}

function changeFilter(key: string, value: string) {
  filters.value = { ...filters.value, [key]: value }
  return search()
}

function clearFilters() {
  pageRequest.value.status = 'ALL'
  pageRequest.value.filterText = ''
  filters.value = {}
  return search()
}

function clearOptionFilters() {
  filters.value = {}
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

function create() {
  return router.push({ name: 'imports.create' })
}

function openDetail(item: { id: string }) {
  return router.push({ name: 'imports.detail', params: { id: item.id } })
}

function showsLines(item: ImportListView) {
  return item.status === 'READY' || item.status === 'SAVED' || item.status === 'UNDONE'
}
</script>

<template>
  <PageContainer class="gap-6">
    <PageHeader :title="$t('imports.title')" :description="$t('imports.list.description')">
      <template #actions>
        <Button type="button" @click="create()"><Plus />{{ $t('imports.actions.create') }}</Button>
      </template>
    </PageHeader>
    <div class="grid gap-4">
      <Card class="grid gap-4 p-4" data-slot="filter-card">
        <SearchControls
          v-model:status="pageRequest.status"
          v-model:filter="pageRequest.filterText"
          :placeholder="$t('imports.search')"
          :status-options="statusOptions"
          :counts="statusCounts"
          @on-filter-change="search()"
          @on-filter-reset="search()"
        />
        <div
          class="border-border grid grid-cols-2 items-end gap-3 border-t pt-4 md:grid-cols-[240px_240px_auto]"
          data-slot="filters"
        >
          <FilterSelect
            class="col-span-2 md:col-span-1"
            :label="$t('imports.filters.destination')"
            :none-label="$t('imports.filters.all')"
            :options="destinationChoices"
            :model-value="filters.destination ?? ''"
            @update:model-value="(value: string) => changeFilter('destination', value)"
          />
          <FilterSelect
            class="col-span-2 md:col-span-1"
            :label="$t('imports.filters.period')"
            :none-label="$t('imports.filters.all')"
            :options="periodChoices"
            :model-value="filters.period ?? ''"
            @update:model-value="(value: string) => changeFilter('period', value)"
          />
          <Button
            type="button"
            variant="ghost"
            class="col-span-2 justify-self-start md:col-span-1"
            :disabled="!filtersActive"
            @click="clearOptionFilters()"
          >
            <X />{{ $t('imports.filters.clear') }}
          </Button>
        </div>
      </Card>
      <ServerErrorAlert :messages="optionErrors.messages.value" />
      <ListState
        v-if="listState !== 'table'"
        :kind="listState"
        entity="imports"
        :icon="FileUp"
        :message="loadErrors.messages.value[0]"
        :query="pageRequest.filterText"
        :copy="listCopy"
        @create="create()"
        @clear="clearFilters()"
        @retry="reload()"
      />
      <ItemsTable
        v-else
        active-sort-icon-only
        :data="pageResponse.content"
        :total-elements="pageResponse.totalElements"
        :noun="$t('imports.list.noun', pageResponse.totalElements)"
        :columns="columns"
        :show-status="false"
        :marked-row="(item: ImportListView) => item.status === 'READY' || item.status === 'FAILED'"
        :loading="busy"
        :current-page="pageRequest.current"
        :page-size="pageRequest.size"
        :sorted-field="pageRequest.sortField"
        :sorted-order="pageRequest.direction"
        detail-route="imports.detail"
        @page-changed="onPageChange"
        @table-sorted="onTableSorted"
        @row-selected="({ data }) => openDetail(data)"
      >
        <template #cell-name="{ item }">
          <span class="[overflow-wrap:anywhere]">{{ item.fileName }}</span>
        </template>
        <template #cell-destination="{ item }"><ImportDestination :source="item" /></template>
        <template #cell-period="{ item }">{{ item.financialPeriod.name }}</template>
        <template #cell-lines="{ item }">
          <template v-if="showsLines(item)">
            <span class="font-mono tabular-nums">{{ item.lines }}</span>
            <span v-if="item.status === 'READY' && item.pending > 0" class="text-muted-foreground">
              · {{ $t('imports.list.pending', { count: item.pending }) }}
            </span>
          </template>
          <span v-else class="text-muted-foreground">—</span>
        </template>
        <template #cell-createdOn="{ item }">
          <DateTimeDisplay with-time :value="item.createdOn" class="font-mono tabular-nums" />
        </template>
        <template #cell-status="{ item }"><ImportStatusBadge :status="item.status" /></template>
      </ItemsTable>
    </div>
  </PageContainer>
</template>
