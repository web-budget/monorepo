<script setup lang="ts">
import { ArrowDownLeft, ArrowUpRight, Clock, Lock, Plus, ReceiptText, X } from 'lucide-vue-next'
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
import UndoPaymentDialog from '@/components/movements/UndoPaymentDialog.vue'
import MovementStatusBadge from '@/components/movements/MovementStatusBadge.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
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
  sortFields: ['name', 'dueDate', 'costCenter', 'value', 'status'],
  defaultSort: { sortField: 'dueDate', direction: 'asc' },
  countsFollowFilters: true,
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

function periodLabel(period: { name: string; expired: boolean; status: string }) {
  if (period.expired) {
    return `${period.name} · ${t('financial-period.status.expired-short')}`
  }
  return period.status === 'CLOSED'
    ? `${period.name} · ${t('financial-period.status.closed-short')}`
    : period.name
}

const periodChoices = computed(() =>
  filterOptions.periods.value.map((period) => ({
    value: period.id,
    label: periodLabel(period),
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
  const narrowed = ['type', 'costCenter', 'classification', 'overdue'].filter(
    (key) => filters.value[key],
  ).length
  return narrowed + (filters.value.period === defaultPeriodId.value ? 0 : 1)
})

const columns = computed(() => [
  {
    field: 'name',
    header: t('movement.table-columns.name'),
    sortable: true,
    mobile: 'title' as const,
  },
  {
    field: 'dueDate',
    header: t('movement.table-columns.due-date'),
    sortable: true,
    mobile: 'line' as const,
  },
  {
    field: 'costCenter',
    header: t('movement.table-columns.cost-center'),
    sortable: true,
    mobile: 'line' as const,
    mobileLabel: false,
  },
  {
    field: 'classification',
    header: t('movement.table-columns.classification'),
    mobile: 'line' as const,
    mobileLabel: false,
  },
  {
    field: 'value',
    header: t('movement.table-columns.value'),
    sortable: true,
    align: 'end' as const,
    mobile: 'value' as const,
  },
  {
    field: 'status',
    header: t('movement.table-columns.status'),
    sortable: true,
    mobile: 'line' as const,
    mobileLabel: false,
  },
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

const listCopy = computed(() => ({
  emptyTitle: selectedPeriod.value
    ? t('movement.list.empty-title', { period: selectedPeriod.value.name })
    : t('movement.list.empty-title-all'),
  emptyDescription: t('movement.list.empty-description'),
  errorDescription: t('movement.list.error-description'),
  noResultQuery: t('movement.list.no-result-query', { query: pageRequest.value.filterText }),
  noResultFilter: t('movement.list.no-result-filter'),
  noResultHint: t('movement.list.no-result-hint'),
  noResultAction: t('movement.list.no-result-action'),
}))

function clearListFilters() {
  pageRequest.value.filterText = ''
  pageRequest.value.status = 'ALL'
  return clearFilters()
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
    <div class="grid gap-4">
      <Alert v-if="selectedPeriod?.expired" variant="attention" data-slot="expired-notice">
        <Clock />
        <AlertTitle>
          {{
            $t('movement.expired-notice.title', {
              name: selectedPeriod.name,
              date: $d(new Date(`${selectedPeriod.endingAt}T00:00:00`), 'short'),
            })
          }}
        </AlertTitle>
        <AlertDescription class="grid gap-2">
          {{ $t('movement.expired-notice.description') }}
          <span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-slot="go-to-closing"
              @click="router.push({ name: 'closing', query: { period: selectedPeriod.id } })"
            >
              <Lock />{{ $t('movement.expired-notice.go-to-closing') }}
            </Button>
          </span>
        </AlertDescription>
      </Alert>
      <div v-if="periodResult" class="grid grid-cols-2 gap-3 md:grid-cols-4" data-slot="summary">
        <Card class="gap-1 p-4">
          <span class="text-muted-foreground text-xs">{{ $t('movement.summary.received') }}</span>
          <CurrencyDisplay
            :value="periodResult.revenues"
            tone="income"
            glued
            class="text-xl font-semibold tracking-tight"
          />
          <span class="text-muted-foreground text-xs">
            {{ $t('movement.summary.received-note') }}
          </span>
        </Card>
        <Card class="gap-1 p-4">
          <span class="text-muted-foreground text-xs">{{ $t('movement.summary.paid') }}</span>
          <CurrencyDisplay
            :value="periodResult.expenses"
            tone="expense"
            glued
            class="text-xl font-semibold tracking-tight"
          />
          <span class="text-muted-foreground text-xs">{{ $t('movement.summary.paid-note') }}</span>
        </Card>
        <Card class="gap-1 p-4">
          <span class="text-muted-foreground text-xs">{{ $t('movement.summary.result') }}</span>
          <CurrencyDisplay
            :value="periodResult.result"
            :signed="periodResult.result < 0"
            glued
            class="text-xl font-semibold tracking-tight"
          />
          <span class="text-muted-foreground text-xs">{{
            $t('movement.summary.result-note')
          }}</span>
        </Card>
        <Card class="gap-1 p-4" data-slot="to-pay">
          <span class="text-muted-foreground text-xs">{{ $t('movement.summary.to-pay') }}</span>
          <CurrencyDisplay
            :value="periodResult.toPay"
            tone="expense"
            glued
            class="text-xl font-semibold tracking-tight"
          />
          <span class="text-muted-foreground flex h-5 items-center text-xs">
            <Badge v-if="periodResult.overdueExpenses > 0" variant="highlight">
              {{
                $t(
                  'movement.summary.overdue-count',
                  { count: periodResult.overdueExpenses },
                  periodResult.overdueExpenses,
                )
              }}
            </Badge>
            <template v-else>{{ $t('movement.summary.nothing-overdue') }}</template>
          </span>
        </Card>
      </div>
      <Card class="grid gap-4 p-4" data-slot="filter-card">
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
          class="border-border grid grid-cols-2 items-end gap-3 border-t pt-4 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto_auto]"
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
      </Card>
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
        :copy="listCopy"
        @create="changeToAdd()"
        @clear="clearListFilters()"
        @retry="reload()"
      />
      <ItemsTable
        active-sort-icon-only
        v-else
        :data="pageResponse.content"
        :total-elements="pageResponse.totalElements"
        :summary="searchSummary"
        :noun="$t('movement.list.noun', pageResponse.totalElements)"
        :columns="columns"
        default-sort-field="dueDate"
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
        <template #cell-name="{ item }">
          {{ item.name }}
          <Badge v-if="item.invoicePayment" variant="outline" class="ml-1">
            {{ $t('movement.badge.invoice') }}
          </Badge>
        </template>
        <template #cell-dueDate="{ item }">
          <DateTimeDisplay fix-time :value="item.dueDate" class="font-mono tabular-nums" />
        </template>
        <template #cell-costCenter="{ item }">{{ item.costCenter?.name }}</template>
        <template #cell-classification="{ item }">{{ item.classification?.name }}</template>
        <template #cell-value="{ item }">
          <span class="inline-flex items-center justify-end gap-1">
            <component
              :is="item.type === 'INCOME' ? ArrowDownLeft : ArrowUpRight"
              :class="['size-3.5', item.type === 'INCOME' ? 'text-income' : 'text-expense']"
            />
            <CurrencyDisplay
              :value="item.value"
              :tone="item.type === 'INCOME' ? 'income' : 'expense'"
              bare
            />
          </span>
        </template>
        <template #cell-status="{ item }">
          <MovementStatusBadge
            :status="item.status"
            :overdue="item.overdue"
            :due-date="item.dueDate"
            :on-card="item.paymentMethod === 'CARD'"
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
            @undo="actions.openUndo(item)"
            @remove="remove(item)"
          />
        </template>
      </ItemsTable>
    </div>
    <UndoPaymentDialog
      :movement="actions.undoTarget.value"
      :loading="loading"
      :messages="actions.undoMessages.value"
      @close="actions.closeUndo()"
      @confirm="actions.undoPayment"
    />
    <PayMovementDialog
      :movement="actions.payTarget.value"
      :wallets="activeWallets.wallets.value"
      :cards="activeCards.cards.value"
      :loading="loading"
      :balance-of="activeWallets.balanceOf"
      :messages="actions.payMessages.value"
      @close="actions.closePay()"
      @pay="actions.pay"
    />
  </PageContainer>
</template>
