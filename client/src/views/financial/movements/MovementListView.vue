<script setup lang="ts">
import { ArrowDownLeft, ArrowUpRight, Clock, Plus, ReceiptText, X } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import ListState from '@/components/listing/ListState.vue'
import SearchControls from '@/components/listing/SearchControls.vue'
import MovementRowActions from '@/components/movements/MovementRowActions.vue'
import PayMovementDialog from '@/components/movements/PayMovementDialog.vue'
import MovementStatusBadge from '@/components/movements/MovementStatusBadge.vue'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useCrudList } from '@/composables/useCrudList'
import { useActiveCards } from '@/composables/useActiveCards'
import { useActiveWallets } from '@/composables/useActiveWallets'
import { useMovementActions } from '@/composables/useMovementActions'
import { useMovementFilterOptions } from '@/composables/useMovementFilterOptions'
import { useServerErrors } from '@/composables/useServerErrors'
import { useFinancialPeriodsStore } from '@/stores/financialPeriods'
import { ALL_PERIODS, MOVEMENT_FILTER_KEYS, useMovementsStore } from '@/stores/movements'
import type { FinancialPeriodResultView, MovementListView, MovementStatusFilter } from '@/types'
import { defaultPeriod } from '@/utils/movements'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const store = useMovementsStore()
const periodsStore = useFinancialPeriodsStore()
const { pageRequest, pageResponse, loading, filters } = storeToRefs(store)

const filterOptions = useMovementFilterOptions()
const optionErrors = useServerErrors()
const resultErrors = useServerErrors()
const periodResult = ref<FinancialPeriodResultView>()

const statusOptions = [
  { label: 'movement.options.all', value: 'ALL' },
  { label: 'movement.options.open', value: 'OPEN' },
  { label: 'movement.options.paid', value: 'PAID' },
]

const defaultPeriodId = computed(() => defaultPeriod(filterOptions.periods.value)?.id)

const periodsReady = optionErrors.run(filterOptions.load).then(applyDefaultPeriod)

function applyDefaultPeriod(): boolean {
  if (filters.value.period !== undefined || defaultPeriodId.value === undefined) {
    return false
  }
  filters.value = { ...filters.value, period: defaultPeriodId.value }
  void router.replace({ query: { ...route.query, period: defaultPeriodId.value } })
  return true
}

async function findAll() {
  await periodsReady
  await store.findAll()
}

async function count(status: MovementStatusFilter) {
  await periodsReady
  return store.count(status)
}

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
  routeName: 'movements',
  entity: 'movement',
  initialStatus: 'ALL',
  statuses: ['ALL', 'OPEN', 'PAID'],
  sortFields: ['name', 'dueDate', 'value', 'status'],
  pageRequest,
  pageResponse,
  loading,
  findAll,
  count,
  remove: store.remove,
  extra: {
    keys: MOVEMENT_FILTER_KEYS,
    values: filters,
    sanitize: (values) => ({
      ...values,
      type: values.type === 'INCOME' || values.type === 'EXPENSE' ? values.type : '',
      overdue: values.overdue === 'true' ? 'true' : '',
      invoices: values.invoices === 'true' ? 'true' : '',
    }),
  },
})

const activeWallets = useActiveWallets()
const activeCards = useActiveCards()
const walletErrors = useServerErrors()
const actions = useMovementActions(async () => {
  await reload()
  await loadResult()
})

onMounted(() =>
  walletErrors.run(async () => {
    await Promise.all([activeWallets.load(), activeCards.load()])
  }),
)

const selectedPeriod = computed(() =>
  filterOptions.periods.value.find((period) => period.id === filters.value.period),
)

const periodChoices = computed(() =>
  filterOptions.periods.value.map((period) => ({
    value: period.id,
    label: period.expired
      ? `${period.name} · ${t('financial-period.status.expired')}`
      : period.name,
  })),
)

const costCenterChoices = computed(() =>
  filterOptions.costCenters.value.map((costCenter) => ({
    value: costCenter.id,
    label: costCenter.fullName,
  })),
)

const classificationChoices = computed(() =>
  filterOptions.classifications.value
    .filter((classification) => !filters.value.type || classification.type === filters.value.type)
    .map((classification) => ({ value: classification.id, label: classification.name })),
)

const typeChoices = computed(() => [
  { value: 'INCOME', label: t('movement.filters.incomes') },
  { value: 'EXPENSE', label: t('movement.filters.expenses') },
])

const classificationLabel = computed(() =>
  filters.value.type === 'INCOME' || filters.value.type === 'EXPENSE'
    ? t(`movement.filters.classification-of-type.${filters.value.type}`)
    : t('movement.filters.classification'),
)

const description = computed(() =>
  selectedPeriod.value
    ? t('movement.list.description', { period: selectedPeriod.value.name })
    : t('movement.list.description-all'),
)

const activeFilters = computed(() => {
  const narrowed = ['type', 'costCenter', 'classification', 'overdue', 'invoices'].filter(
    (key) => filters.value[key],
  ).length
  return narrowed + (filters.value.period === defaultPeriodId.value ? 0 : 1)
})

const columns = computed(() => [
  { field: 'name', header: t('movement.table-columns.name'), sortable: true },
  { field: 'dueDate', header: t('movement.table-columns.due-date'), sortable: true },
  {
    field: 'value',
    header: t('movement.table-columns.value'),
    sortable: true,
    align: 'end' as const,
  },
  { field: 'status', header: t('movement.table-columns.status'), sortable: true },
])

function changeFilter(key: string, value: string) {
  const next = { ...filters.value, [key]: value }
  if (key === 'type' && value !== '') {
    const compatible = filterOptions.classifications.value.some(
      (classification) =>
        classification.id === next.classification && classification.type === value,
    )
    if (!compatible) {
      next.classification = ''
    }
  }
  filters.value = next
  return search()
}

function changePeriod(value: string) {
  return changeFilter('period', value === '' ? ALL_PERIODS : value)
}

function clearFilters() {
  filters.value = { period: defaultPeriodId.value ?? ALL_PERIODS }
  return search()
}

function signedValue(item: MovementListView) {
  return item.type === 'INCOME' ? item.value : -item.value
}

async function loadResult() {
  const period = filters.value.period
  periodResult.value = undefined
  if (period && period !== ALL_PERIODS) {
    await resultErrors.run(async () => {
      periodResult.value = await periodsStore.findResult(period)
    })
  }
}

watch(() => filters.value.period, loadResult)

onMounted(async () => {
  const defaulted = await periodsReady
  if (!defaulted) {
    await loadResult()
  }
})
</script>

<template>
  <PageContainer class="gap-6">
    <PageHeader :title="$t('movement.title')" :description="description">
      <template #actions>
        <Button type="button" @click="changeToAdd()"> <Plus />{{ $t('form.create') }} </Button>
      </template>
    </PageHeader>
    <div class="grid gap-3">
      <Alert v-if="selectedPeriod?.expired" variant="attention" data-slot="expired-notice">
        <Clock />
        <AlertTitle>
          {{
            $t('movement.expired-notice', {
              name: selectedPeriod.name,
              date: $d(new Date(`${selectedPeriod.endingAt}T00:00:00`), 'short'),
            })
          }}
        </AlertTitle>
      </Alert>
      <div v-if="periodResult" class="grid grid-cols-1 gap-3 sm:grid-cols-3" data-slot="summary">
        <Card class="gap-1 p-4">
          <span class="text-muted-foreground text-xs">{{ $t('movement.summary.received') }}</span>
          <CurrencyDisplay :value="periodResult.revenues" signed class="text-xl font-semibold" />
          <span class="text-muted-foreground text-xs">
            {{ $t('movement.summary.received-note') }}
          </span>
        </Card>
        <Card class="gap-1 p-4">
          <span class="text-muted-foreground text-xs">{{ $t('movement.summary.paid') }}</span>
          <CurrencyDisplay :value="-periodResult.expenses" signed class="text-xl font-semibold" />
          <span class="text-muted-foreground text-xs">{{ $t('movement.summary.paid-note') }}</span>
        </Card>
        <Card class="gap-1 p-4">
          <span class="text-muted-foreground text-xs">{{ $t('movement.summary.result') }}</span>
          <CurrencyDisplay :value="periodResult.result" signed class="text-xl font-semibold" />
          <span class="text-muted-foreground text-xs">{{
            $t('movement.summary.result-note')
          }}</span>
        </Card>
      </div>
      <SearchControls
        v-model:status="pageRequest.status"
        v-model:filter="pageRequest.filterText"
        :placeholder="$t('movement.search.placeholder')"
        :status-options="statusOptions"
        :counts="counts"
        @on-filter-change="search()"
        @on-filter-reset="search()"
      />
      <div
        class="grid grid-cols-2 items-end gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto_auto_auto]"
        data-slot="filters"
      >
        <FilterSelect
          class="col-span-2 lg:col-span-1"
          :label="$t('movement.filters.period')"
          :none-label="$t('movement.filters.all-periods')"
          :options="periodChoices"
          :model-value="filters.period === ALL_PERIODS ? '' : (filters.period ?? '')"
          @update:model-value="changePeriod"
        />
        <FilterSelect
          :label="$t('movement.filters.type')"
          :none-label="$t('movement.filters.all-types')"
          :options="typeChoices"
          :model-value="filters.type ?? ''"
          @update:model-value="(value: string) => changeFilter('type', value)"
        />
        <FilterSelect
          :label="$t('movement.filters.cost-center')"
          :none-label="$t('movement.filters.all-cost-centers')"
          :options="costCenterChoices"
          :model-value="filters.costCenter ?? ''"
          @update:model-value="(value: string) => changeFilter('costCenter', value)"
        />
        <FilterSelect
          :label="classificationLabel"
          :none-label="$t('movement.filters.all-classifications')"
          :options="classificationChoices"
          :model-value="filters.classification ?? ''"
          @update:model-value="(value: string) => changeFilter('classification', value)"
        />
        <div class="flex h-9 items-center gap-2.5 self-end">
          <Switch
            id="movement-overdue"
            :model-value="filters.overdue === 'true'"
            @update:model-value="(value: boolean) => changeFilter('overdue', value ? 'true' : '')"
          />
          <Label for="movement-overdue">{{ $t('movement.filters.overdue') }}</Label>
        </div>
        <div class="flex h-9 items-center gap-2.5 self-end">
          <Switch
            id="movement-invoices"
            :model-value="filters.invoices === 'true'"
            @update:model-value="(value: boolean) => changeFilter('invoices', value ? 'true' : '')"
          />
          <Label for="movement-invoices">{{ $t('movement.filters.invoices') }}</Label>
        </div>
        <Button
          type="button"
          variant="ghost"
          :disabled="activeFilters === 0"
          @click="clearFilters()"
        >
          <X />
          {{
            activeFilters > 0
              ? $t('movement.filters.clear-count', { count: activeFilters })
              : $t('movement.filters.clear')
          }}
        </Button>
      </div>
      <ServerErrorAlert
        :messages="[
          ...messages,
          ...optionErrors.messages.value,
          ...resultErrors.messages.value,
          ...walletErrors.messages.value,
          ...actions.messages.value,
        ]"
      />
      <ListState
        v-if="listState !== 'table'"
        :kind="listState"
        entity="movement"
        :icon="ReceiptText"
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
        :show-status="false"
        :marked-row="(item: MovementListView) => item.overdue"
        :loading="busy"
        :current-page="pageRequest.current"
        :page-size="pageRequest.size"
        :sorted-field="pageRequest.sortField"
        :sorted-order="pageRequest.direction"
        detail-route="movements.detail"
        @page-changed="onPageChange"
        @table-sorted="onTableSorted"
        @row-selected="changeToDetail"
      >
        <template #cell-dueDate="{ item }">
          <DateTimeDisplay fix-time :value="item.dueDate" class="font-mono tabular-nums" />
        </template>
        <template #cell-value="{ item }">
          <span class="inline-flex items-center justify-end gap-1">
            <component
              :is="item.type === 'INCOME' ? ArrowDownLeft : ArrowUpRight"
              :class="['size-3.5', item.type === 'INCOME' ? 'text-income' : 'text-expense']"
            />
            <CurrencyDisplay :value="signedValue(item)" signed />
          </span>
        </template>
        <template #cell-status="{ item }">
          <MovementStatusBadge
            :status="item.status"
            :overdue="item.overdue"
            :due-date="item.dueDate"
          />
        </template>
        <template #actions="{ item }">
          <MovementRowActions
            :status="item.status"
            :type="item.type"
            :period-open="item.financialPeriod.status === 'OPEN'"
            @details="changeToDetail({ data: item, index: 0 })"
            @pay="actions.openPayWithSuggestion(item)"
            @edit="changeToUpdate(item.id)"
            @undo="actions.undoPayment(item)"
            @remove="remove(item)"
          />
        </template>
      </ItemsTable>
    </div>
    <PayMovementDialog
      :movement="actions.payTarget.value"
      :wallets="activeWallets.wallets.value"
      :cards="activeCards.cards.value"
      :loading="loading"
      :balance-of="activeWallets.balanceOf"
      @close="actions.closePay()"
      @pay="actions.pay"
    />
  </PageContainer>
</template>
