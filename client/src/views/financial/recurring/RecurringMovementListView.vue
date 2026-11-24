<script setup lang="ts">
import { ListChecks, Plus, RefreshCw, X, Zap } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import ListState from '@/components/listing/ListState.vue'
import SearchControls from '@/components/listing/SearchControls.vue'
import ReadjustValueDialog from '@/components/recurring/ReadjustValueDialog.vue'
import RecurringInstallments from '@/components/recurring/RecurringInstallments.vue'
import RecurringRowActions from '@/components/recurring/RecurringRowActions.vue'
import RecurringStatusBadge from '@/components/recurring/RecurringStatusBadge.vue'
import RecurringValueKindBadge from '@/components/recurring/RecurringValueKindBadge.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useCrudList } from '@/composables/useCrudList'
import { useReadjustValue } from '@/composables/useReadjustValue'
import { RECURRING_FILTER_KEYS, useRecurringMovementsStore } from '@/stores/recurringMovements'
import type { RecurringMovementStatusFilter, RecurringMovementView } from '@/types'
import { signedValue } from '@/utils/recurringMovements'

const { t } = useI18n()

const store = useRecurringMovementsStore()
const { pageRequest, pageResponse, loading, filters } = storeToRefs(store)

const statusOptions = [
  { label: 'recurrent-movement.status-tabs.active', value: 'ACTIVE' },
  { label: 'recurrent-movement.status-tabs.finished', value: 'FINISHED' },
  { label: 'search-control.all', value: 'ALL' },
]

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
} = useCrudList<RecurringMovementStatusFilter>({
  routeName: 'recurring-movements',
  entity: 'recurrent-movement',
  initialStatus: 'ACTIVE',
  statuses: ['ACTIVE', 'FINISHED', 'ALL'],
  sortFields: ['name', 'value', 'valueKind'],
  defaultSort: { sortField: 'name', direction: 'asc' },
  pageRequest,
  pageResponse,
  loading,
  findAll: store.findAll,
  count: store.count,
  remove: store.remove,
  extra: {
    keys: RECURRING_FILTER_KEYS,
    values: filters,
    sanitize: (values) => ({
      ...values,
      type: values.type === 'INCOME' || values.type === 'EXPENSE' ? values.type : '',
    }),
  },
})

const readjust = useReadjustValue(reload)

const typeChoices = computed(() => [
  { value: 'INCOME', label: t('recurrent-movement.filters.incomes') },
  { value: 'EXPENSE', label: t('recurrent-movement.filters.expenses') },
])

const columns = computed(() => [
  {
    field: 'name',
    header: t('recurrent-movement.table-columns.name'),
    sortable: true,
    mobile: 'title' as const,
  },
  {
    field: 'value',
    header: t('recurrent-movement.table-columns.value'),
    sortable: true,
    align: 'end' as const,
    mobile: 'value' as const,
  },
  {
    field: 'valueKind',
    header: t('recurrent-movement.table-columns.value-kind'),
    sortable: true,
    mobile: 'line' as const,
    mobileLabel: false,
  },
  {
    field: 'installments',
    header: t('recurrent-movement.table-columns.installments'),
    mobile: 'line' as const,
  },
  {
    field: 'launch',
    header: t('recurrent-movement.table-columns.launch'),
    mobile: 'line' as const,
    mobileLabel: false,
  },
  {
    field: 'situation',
    header: t('recurrent-movement.table-columns.situation'),
    mobile: 'line' as const,
    mobileLabel: false,
  },
])

const listCopy = computed(() => ({
  emptyTitle: t('recurrent-movement.list.empty-title'),
  emptyDescription: t('recurrent-movement.list.empty-description'),
  errorDescription: t('recurrent-movement.list.error-description'),
  noResultQuery: t('recurrent-movement.list.no-result'),
  noResultFilter: t('recurrent-movement.list.no-result'),
  noResultHint: t('recurrent-movement.list.no-result-hint'),
  noResultAction: t('recurrent-movement.list.no-result-action'),
}))

function changeType(value: string) {
  filters.value = { ...filters.value, type: value }
  return search()
}

function clearFilters() {
  filters.value = {}
  return search()
}

function clearListFilters() {
  pageRequest.value.filterText = ''
  pageRequest.value.status = 'ACTIVE'
  return clearFilters()
}

function openDetail(recurringMovement: RecurringMovementView) {
  return changeToDetail({ data: recurringMovement, index: 0 })
}
</script>

<template>
  <PageContainer class="gap-6">
    <PageHeader
      :title="$t('recurrent-movement.title')"
      :description="$t('recurrent-movement.list.description')"
    >
      <template #actions>
        <Button as-child variant="outline">
          <RouterLink to="/financial/recurring-movements/launch">
            <ListChecks />{{ $t('recurrent-movement.list.launch') }}
          </RouterLink>
        </Button>
        <Button type="button" @click="changeToAdd()"> <Plus />{{ $t('form.create') }} </Button>
      </template>
    </PageHeader>
    <div class="grid gap-4">
      <Card class="p-4" data-slot="filter-card">
        <SearchControls
          v-model:status="pageRequest.status"
          v-model:filter="pageRequest.filterText"
          :placeholder="$t('recurrent-movement.search.placeholder')"
          :status-options="statusOptions"
          :counts="counts"
          @on-filter-change="search()"
          @on-filter-reset="search()"
        >
          <FilterSelect
            class="w-44"
            hide-label
            :label="$t('recurrent-movement.filters.type')"
            :none-label="$t('recurrent-movement.filters.all-types')"
            :options="typeChoices"
            :model-value="filters.type ?? ''"
            @update:model-value="changeType"
          />
          <Button v-if="filters.type" type="button" variant="ghost" @click="clearFilters()">
            <X />{{ $t('recurrent-movement.filters.clear') }}
          </Button>
        </SearchControls>
      </Card>
      <ServerErrorAlert :messages="[...messages, ...readjust.messages.value]" />
      <ListState
        v-if="listState !== 'table'"
        :kind="listState"
        entity="recurrent-movement"
        :icon="RefreshCw"
        :query="pageRequest.filterText"
        :message="loadMessages[0]"
        :copy="listCopy"
        @create="changeToAdd()"
        @clear="clearListFilters()"
        @retry="reload()"
      />
      <ItemsTable
        v-else
        active-sort-icon-only
        default-sort-field="name"
        :data="pageResponse.content"
        :total-elements="pageResponse.totalElements"
        :summary="searchSummary"
        :noun="$t('recurrent-movement.list.noun', pageResponse.totalElements)"
        :columns="columns"
        :show-status="false"
        :loading="busy"
        :current-page="pageRequest.current"
        :page-size="pageRequest.size"
        :sorted-field="pageRequest.sortField"
        :sorted-order="pageRequest.direction"
        detail-route="recurring-movements.detail"
        @page-changed="onPageChange"
        @table-sorted="onTableSorted"
        @row-selected="changeToDetail"
      >
        <template #cell-value="{ item }">
          <span class="inline-flex items-center justify-end gap-1.5">
            <span
              v-if="item.valueKind === 'VARIABLE'"
              class="text-muted-foreground text-xs"
              data-slot="last-value"
            >
              {{ $t('recurrent-movement.last-value') }}
            </span>
            <CurrencyDisplay :value="signedValue(item)" signed glued bare />
          </span>
        </template>
        <template #cell-valueKind="{ item }">
          <RecurringValueKindBadge :value-kind="item.valueKind" />
        </template>
        <template #cell-installments="{ item }">
          <RecurringInstallments :recurring-movement="item" />
        </template>
        <template #cell-launch="{ item }">
          <span v-if="item.autoLaunch" class="inline-flex items-center gap-1">
            <Zap class="text-muted-foreground size-3.5" />{{ $t('recurrent-movement.launch.auto') }}
          </span>
          <template v-else>{{ $t('recurrent-movement.launch.manual') }}</template>
        </template>
        <template #cell-situation="{ item }">
          <RecurringStatusBadge :ended="item.ended" />
        </template>
        <template #actions="{ item }">
          <RecurringRowActions
            :value-kind="item.valueKind"
            @details="openDetail(item)"
            @edit="changeToUpdate(item.id)"
            @readjust="readjust.open(item)"
            @remove="remove(item)"
          />
        </template>
      </ItemsTable>
    </div>
    <ReadjustValueDialog
      :recurring-movement="readjust.target.value"
      :loading="loading"
      @close="readjust.close()"
      @confirm="readjust.confirm"
    />
  </PageContainer>
</template>
