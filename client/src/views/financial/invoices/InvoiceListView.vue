<script setup lang="ts">
import { CreditCard, FileUp, Plus } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { cardsApi } from '@/api/cards'
import { financialPeriodsApi } from '@/api/financialPeriods'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import CloseInvoiceDialog from '@/components/invoices/CloseInvoiceDialog.vue'
import InvoiceRowActions from '@/components/invoices/InvoiceRowActions.vue'
import InvoiceStatusBadge from '@/components/invoices/InvoiceStatusBadge.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import ListState, { type ListStateKind } from '@/components/listing/ListState.vue'
import StatusTabs from '@/components/listing/StatusTabs.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useCloseInvoice } from '@/composables/useCloseInvoice'
import { useListFilters } from '@/composables/useListFilters'
import { useServerErrors } from '@/composables/useServerErrors'
import { ALL_PERIODS, INVOICE_FILTER_KEYS, useInvoicesStore } from '@/stores/invoices'
import type {
  CardListView,
  FinancialPeriodListView,
  InvoiceStatusFilter,
  InvoiceView,
} from '@/types'
import { defaultPeriod } from '@/utils/movements'

const OPTIONS_PAGE_SIZE = 100

const { t } = useI18n()
const router = useRouter()

const store = useInvoicesStore()
const { pageRequest, pageResponse, loading, filters } = storeToRefs(store)

const loadErrors = useServerErrors()
const optionErrors = useServerErrors()

const periods = ref<FinancialPeriodListView[]>([])
const cards = ref<CardListView[]>([])
const counts = ref<Partial<Record<InvoiceStatusFilter, number | null>>>({})
const loadFailed = ref(false)
const initializing = ref(true)

const statuses: InvoiceStatusFilter[] = ['ALL', 'OPEN', 'CLOSED', 'PAID']
const statusOptions = [
  { label: 'credit-card-invoice.options.all', value: 'ALL' },
  { label: 'credit-card-invoice.options.open', value: 'OPEN' },
  { label: 'credit-card-invoice.options.closed', value: 'CLOSED' },
  { label: 'credit-card-invoice.options.paid', value: 'PAID' },
]

const { writeRoute } = useListFilters({
  pageRequest,
  initialStatus: 'ALL',
  statuses,
  sortFields: ['name', 'period', 'value', 'status'],
  defaultSort: { sortField: 'name', direction: 'asc' },
  extra: { keys: INVOICE_FILTER_KEYS, values: filters },
  onExternalChange: reload,
})

const ready = optionErrors
  .run(async () => {
    const [periodPage, cardPage] = await Promise.all([
      financialPeriodsApi.findAll({ status: 'ALL', size: OPTIONS_PAGE_SIZE }),
      cardsApi.findAll({ status: 'ACTIVE', size: OPTIONS_PAGE_SIZE, sort: 'name,asc' }),
    ])
    periods.value = periodPage.content
    cards.value = cardPage.content
  })
  .then(applyDefaultPeriod)

function applyDefaultPeriod() {
  const period = defaultPeriod(periods.value)
  if (filters.value.period === undefined && period) {
    filters.value = { ...filters.value, period: period.id }
  }
}

async function loadCounts() {
  const entries = await Promise.all(
    statuses.map(async (status) => [status, await store.count(status)] as const),
  )
  counts.value = Object.fromEntries(entries)
}

async function reload() {
  await ready
  writeRoute()
  loadFailed.value = !(await loadErrors.run(store.findAll))
  initializing.value = false
}

const closing = useCloseInvoice(async () => {
  await reload()
  void loadCounts()
})

onMounted(async () => {
  await reload()
  void loadCounts()
})

const busy = computed(() => loading.value || initializing.value)
const narrowed = computed(() => Boolean(filters.value.card) || pageRequest.value.status !== 'ALL')
const listState = computed<ListStateKind | 'table'>(() => {
  if (loadFailed.value) {
    return 'error'
  }
  if (busy.value || pageResponse.value.totalElements > 0) {
    return 'table'
  }
  return narrowed.value ? 'no-result' : 'empty'
})

const periodChoices = computed(() =>
  periods.value.map((period) => ({ value: period.id, label: period.name })),
)
const cardChoices = computed(() =>
  cards.value.map((card) => ({ value: card.id, label: card.name })),
)

const columns = computed(() => [
  {
    field: 'name',
    header: t('credit-card-invoice.table-columns.card'),
    sortable: true,
    mobile: 'title' as const,
  },
  {
    field: 'period',
    header: t('credit-card-invoice.table-columns.period'),
    sortable: true,
    mobile: 'line' as const,
    mobileLabel: false,
  },
  {
    field: 'purchaseCount',
    header: t('credit-card-invoice.table-columns.purchases'),
    align: 'end' as const,
    mobile: 'line' as const,
  },
  {
    field: 'dueDate',
    header: t('credit-card-invoice.table-columns.due-date'),
    mobile: 'line' as const,
  },
  {
    field: 'value',
    header: t('credit-card-invoice.table-columns.value'),
    sortable: true,
    align: 'end' as const,
    mobile: 'value' as const,
  },
  {
    field: 'status',
    header: t('credit-card-invoice.table-columns.status'),
    sortable: true,
    mobile: 'line' as const,
    mobileLabel: false,
  },
])

const listCopy = computed(() => ({
  emptyAction: t('credit-card-invoice.list.empty-action'),
  errorDescription: t('credit-card-invoice.list.error-description'),
  noResultFilter: t('credit-card-invoice.list.no-result-filter'),
  noResultHint: t('credit-card-invoice.list.no-result-hint'),
  noResultAction: t('credit-card-invoice.list.no-result-action'),
}))

function search() {
  pageRequest.value.current = 0
  return reload()
}

function changeFilter(key: string, value: string) {
  filters.value = { ...filters.value, [key]: value }
  return search()
}

function changePeriod(value: string) {
  return changeFilter('period', value === '' ? ALL_PERIODS : value)
}

function changeStatus(status: string) {
  pageRequest.value.status = status as InvoiceStatusFilter
  return search()
}

function clearFilters() {
  pageRequest.value.status = 'ALL'
  filters.value = { period: ALL_PERIODS }
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

function createPurchase(invoice?: InvoiceView) {
  return router.push({
    name: 'purchases.create',
    query: invoice ? { card: invoice.card.id, period: invoice.financialPeriod.id } : undefined,
  })
}

function importInvoice(invoice?: InvoiceView) {
  return router.push({
    name: 'imports.create',
    query: invoice ? { card: invoice.card.id, period: invoice.financialPeriod.id } : undefined,
  })
}

function openDetail(invoice: { id: string }) {
  return router.push({ name: 'invoices.detail', params: { id: invoice.id } })
}

function createPeriod() {
  return router.push({ name: 'financial-periods.create' })
}
</script>

<template>
  <PageContainer class="gap-6">
    <PageHeader
      :title="$t('credit-card-invoice.title')"
      :description="$t('credit-card-invoice.list.description')"
    >
      <template #actions>
        <Button type="button" variant="outline" @click="importInvoice()">
          <FileUp />{{ $t('credit-card-invoice.actions.import') }}
        </Button>
        <Button type="button" @click="createPurchase()">
          <Plus />{{ $t('credit-card-invoice.actions.new-purchase') }}
        </Button>
      </template>
    </PageHeader>
    <div class="grid gap-4">
      <Card class="flex-row flex-wrap items-end justify-between gap-3 p-4" data-slot="filter-card">
        <div
          class="grid w-full grid-cols-2 gap-3 md:w-auto md:grid-cols-[220px_220px]"
          data-slot="filters"
        >
          <FilterSelect
            :label="$t('credit-card-invoice.filters.period')"
            :none-label="$t('credit-card-invoice.filters.all-periods')"
            :options="periodChoices"
            :model-value="filters.period === ALL_PERIODS ? '' : (filters.period ?? '')"
            @update:model-value="changePeriod"
          />
          <FilterSelect
            :label="$t('credit-card-invoice.filters.card')"
            :none-label="$t('credit-card-invoice.filters.all-cards')"
            :options="cardChoices"
            :model-value="filters.card ?? ''"
            @update:model-value="(value: string) => changeFilter('card', value)"
          />
        </div>
        <StatusTabs
          :status="pageRequest.status"
          :options="statusOptions"
          :counts="counts"
          @select="changeStatus"
        />
      </Card>
      <ServerErrorAlert :messages="[...optionErrors.messages.value, ...closing.messages.value]" />
      <ListState
        v-if="listState !== 'table'"
        :kind="listState"
        entity="credit-card-invoice"
        :icon="CreditCard"
        :message="loadErrors.messages.value[0]"
        :copy="listCopy"
        outline-action
        @create="createPeriod()"
        @clear="clearFilters()"
        @retry="reload()"
      />
      <ItemsTable
        v-else
        active-sort-icon-only
        :data="pageResponse.content"
        :total-elements="pageResponse.totalElements"
        :noun="$t('credit-card-invoice.list.noun', pageResponse.totalElements)"
        :columns="columns"
        default-sort-field="name"
        :show-status="false"
        :marked-row="(invoice: InvoiceView) => invoice.status === 'CLOSED'"
        :loading="busy"
        :current-page="pageRequest.current"
        :page-size="pageRequest.size"
        :sorted-field="pageRequest.sortField"
        :sorted-order="pageRequest.direction"
        detail-route="invoices.detail"
        @page-changed="onPageChange"
        @table-sorted="onTableSorted"
        @row-selected="({ data }) => openDetail(data)"
      >
        <template #cell-name="{ item }">
          {{ item.card.name }}
          <span class="text-muted-foreground font-mono text-xs"
            >••{{ item.card.lastFourDigits }}</span
          >
        </template>
        <template #cell-period="{ item }">{{ item.financialPeriod.name }}</template>
        <template #cell-purchaseCount="{ item }">
          <span class="font-mono tabular-nums">{{ item.purchaseCount }}</span>
        </template>
        <template #cell-dueDate="{ item }">
          <span v-if="item.status === 'OPEN' || !item.dueDate" class="text-muted-foreground">
            {{ $t('credit-card-invoice.due-date-open') }}
          </span>
          <DateTimeDisplay v-else fix-time :value="item.dueDate" class="font-mono tabular-nums" />
        </template>
        <template #cell-value="{ item }"><CurrencyDisplay :value="item.value" bare /></template>
        <template #cell-status="{ item }"><InvoiceStatusBadge :status="item.status" /></template>
        <template #actions="{ item }">
          <InvoiceRowActions
            :open="item.status === 'OPEN'"
            @details="openDetail(item)"
            @purchase="createPurchase(item)"
            @import="importInvoice(item)"
            @close="closing.open(item)"
          />
        </template>
      </ItemsTable>
    </div>
  </PageContainer>
  <CloseInvoiceDialog
    v-bind="closing.dialog.value"
    @close="closing.cancel"
    @confirm="closing.confirm"
  />
</template>
