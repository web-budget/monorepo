<script setup lang="ts">
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CheckCheck,
  FileUp,
  ScrollText,
  Undo2,
  X,
} from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import MoneyFilter from '@/components/forms/MoneyFilter.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import ListState, { type ListStateKind } from '@/components/listing/ListState.vue'
import SearchControls from '@/components/listing/SearchControls.vue'
import OperationBadge from '@/components/statement/OperationBadge.vue'
import GiveBackDialog from '@/components/transfers/GiveBackDialog.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ReconcileDialog from '@/components/wallets/ReconcileDialog.vue'
import { useActiveWallets } from '@/composables/useActiveWallets'
import { useGiveBack } from '@/composables/useGiveBack'
import { useListFilters } from '@/composables/useListFilters'
import { useMovementFilterOptions } from '@/composables/useMovementFilterOptions'
import { useReconciliation } from '@/composables/useReconciliation'
import { useServerErrors } from '@/composables/useServerErrors'
import { STATEMENT_FILTER_KEYS, useStatementStore, WALLET_ENTRY_ORIGINS } from '@/stores/statement'
import { useTransfersStore } from '@/stores/transfers'
import type { WalletEntryDirectionFilter, WalletEntryView } from '@/types'
import { defaultStatementWallet, entryLabel } from '@/utils/statement'
import { typeKey } from '@/utils/typeLabels'

const { t } = useI18n()
const router = useRouter()

const store = useStatementStore()
const transfers = useTransfersStore()
const { pageRequest, pageResponse, loading, filters, summary } = storeToRefs(store)

const activeWallets = useActiveWallets()
const options = useMovementFilterOptions()
const giveBack = useGiveBack()
const loadErrors = useServerErrors()
const optionErrors = useServerErrors()
const actionErrors = useServerErrors()

const balance = ref<number | null>(null)
const loadFailed = ref(false)
const initializing = ref(true)

const statuses: WalletEntryDirectionFilter[] = ['ALL', 'CREDIT', 'DEBIT']
const statusOptions = [
  { label: 'statement.options.all', value: 'ALL' },
  { label: 'statement.options.credit', value: 'CREDIT' },
  { label: 'statement.options.debit', value: 'DEBIT' },
]

const { writeRoute } = useListFilters({
  pageRequest,
  initialStatus: 'ALL',
  statuses,
  sortFields: ['name', 'createdOn', 'value', 'origin', 'direction'],
  extra: {
    keys: STATEMENT_FILTER_KEYS,
    values: filters,
    sanitize: (values) => ({
      ...values,
      origin: WALLET_ENTRY_ORIGINS.some((origin) => origin === values.origin) ? values.origin! : '',
    }),
  },
  onExternalChange: reload,
})

const ready = optionErrors
  .run(async () => {
    await Promise.all([activeWallets.load('ALL'), options.load()])
  })
  .then(applyDefaultWallet)

function applyDefaultWallet() {
  if (filters.value.wallet !== undefined) {
    return
  }
  const wallet = defaultStatementWallet(activeWallets.wallets.value)
  if (wallet) {
    filters.value = { ...filters.value, wallet: wallet.id }
  }
}

async function reload() {
  await ready
  writeRoute()
  if (filters.value.wallet === undefined) {
    initializing.value = false
    return
  }
  const [listed] = await Promise.all([
    loadErrors.run(store.findAll),
    loadErrors.run(store.findSummary),
  ])
  loadFailed.value = !listed
  initializing.value = false
}

async function loadBalance() {
  const walletId = filters.value.wallet
  balance.value = null
  if (walletId) {
    await actionErrors.run(async () => {
      balance.value = await activeWallets.balanceOf(walletId)
    })
  }
}

onMounted(async () => {
  await reload()
  await loadBalance()
})

watch(() => filters.value.wallet, loadBalance)

const wallet = computed(() =>
  activeWallets.wallets.value.find((candidate) => candidate.id === filters.value.wallet),
)
const hasCompartments = computed(() => (wallet.value?.compartmentCount ?? 0) > 0)
const busy = computed(() => loading.value || initializing.value)
const hasFilters = computed(() =>
  ['period', 'origin', 'from', 'to', 'min', 'max'].some((key) => filters.value[key]),
)
const listState = computed<ListStateKind | 'table'>(() => {
  if (loadFailed.value) {
    return 'error'
  }
  if (busy.value || pageResponse.value.totalElements > 0) {
    return 'table'
  }
  const narrowed =
    hasFilters.value || pageRequest.value.filterText !== '' || pageRequest.value.status !== 'ALL'
  return narrowed ? 'no-result' : 'empty'
})
const listCopy = computed(() => ({
  emptyTitle: t('statement.list.empty-title', { name: wallet.value?.name }),
  emptyDescription: t('statement.list.empty-description'),
  errorDescription: t('statement.list.error-description'),
  noResultQuery: t('statement.list.no-result-query', { query: pageRequest.value.filterText }),
  noResultFilter: t('statement.list.no-result-filter'),
  noResultHint: t('statement.list.no-result-hint'),
  noResultAction: t('statement.list.no-result-action'),
}))

const walletChoices = computed(() =>
  activeWallets.wallets.value.map((candidate) => ({
    value: candidate.id,
    label: candidate.active ? candidate.name : `${candidate.name} (${t('statement.inactive')})`,
  })),
)
const periodChoices = computed(() =>
  options.periods.value.map((period) => ({ value: period.id, label: period.name })),
)
const originChoices = computed(() =>
  WALLET_ENTRY_ORIGINS.map((origin) => ({ value: origin, label: t(`statement.origin.${origin}`) })),
)

const columns = computed(() => [
  {
    field: 'createdOn',
    header: t('statement.table-columns.created-on'),
    sortable: true,
    mobile: 'line' as const,
    mobileLabel: false,
  },
  {
    field: 'origin',
    header: t('statement.table-columns.origin'),
    sortable: true,
    mobile: 'line' as const,
    mobileLabel: false,
  },
  {
    field: 'name',
    header: t('statement.table-columns.name'),
    sortable: true,
    class: 'max-w-[24rem]',
    mobile: 'title' as const,
  },
  {
    field: 'value',
    header: t('statement.table-columns.value'),
    sortable: true,
    align: 'end' as const,
    mobile: 'value' as const,
  },
  {
    field: 'previousBalance',
    header: t('statement.table-columns.previous-balance'),
    align: 'end' as const,
    mobile: 'line' as const,
  },
  {
    field: 'resultingBalance',
    header: t('statement.table-columns.resulting-balance'),
    align: 'end' as const,
    mobile: 'line' as const,
  },
  {
    field: 'reference',
    header: t('statement.open-origin-header'),
    srOnly: true,
    mobile: 'line' as const,
    mobileLabel: false,
  },
])

const REFERENCE_PATHS = { MOVEMENT: 'movements', TRANSFER: 'transfers' } as const

function originPath(entry: WalletEntryView): RouteLocationRaw | null {
  const reference = entry.reference
  if (!reference) {
    return null
  }
  if (reference.type === 'COMPARTMENT') {
    return `/registration/wallets/${filters.value.wallet}/compartments/${reference.id}/detail?movement=${reference.movementId}`
  }
  if (reference.type === 'RECONCILIATION') {
    return {
      name: 'wallets.detail',
      params: { id: filters.value.wallet! },
      query: { reconciliation: reference.id },
    }
  }
  return `/financial/${REFERENCE_PATHS[reference.type]}/${reference.id}/detail`
}

function isReconciled(entry: WalletEntryView) {
  return entry.reference?.type === 'RECONCILIATION'
}

function openEntry(entry: WalletEntryView) {
  const opensOrigin = entry.reference != null && !isReconciled(entry)
  return router.push(
    opensOrigin
      ? originPath(entry)!
      : `/financial/statement/${filters.value.wallet}/${entry.id}/detail`,
  )
}

function startGiveBack(entry: WalletEntryView) {
  return actionErrors.run(async () => {
    giveBack.open(await transfers.findOne(entry.reference!.id))
  })
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
  filters.value = Object.fromEntries(
    Object.entries(filters.value).filter(([key]) => key === 'wallet'),
  )
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

function clearSearch() {
  pageRequest.value.filterText = ''
  return search()
}

const reconciliation = useReconciliation(async () => {
  await reload()
  await loadBalance()
})
</script>

<template>
  <PageContainer class="gap-6">
    <PageHeader
      :title="$t('statement.title')"
      :description="wallet ? $t('statement.description', { name: wallet.name }) : undefined"
    >
      <template #actions>
        <Button as-child variant="outline">
          <RouterLink :to="{ name: 'imports.create', query: { wallet: wallet?.id ?? '' } }">
            <FileUp />{{ $t('statement.actions.import') }}
          </RouterLink>
        </Button>
        <Button
          type="button"
          variant="outline"
          :disabled="!wallet?.active || balance === null"
          @click="reconciliation.open(wallet!)"
        >
          <CheckCheck />{{ $t('statement.actions.reconcile') }}
        </Button>
        <Button as-child variant="outline">
          <RouterLink :to="{ path: '/financial/transfers/create', query: { from: wallet?.id } }">
            <ArrowLeftRight />{{ $t('statement.actions.transfer') }}
          </RouterLink>
        </Button>
      </template>
    </PageHeader>
    <div class="grid gap-4">
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card class="col-span-2 content-between gap-2 p-4 lg:col-span-1">
          <FilterSelect
            :label="$t('statement.filters.wallet')"
            :options="walletChoices"
            :model-value="filters.wallet ?? ''"
            @update:model-value="(value: string) => changeFilter('wallet', value)"
          />
          <span v-if="wallet" class="text-muted-foreground text-xs">
            {{ $t(typeKey('wallet', wallet.type))
            }}<template v-if="wallet.bank">, {{ wallet.bank }}</template>
          </span>
        </Card>
        <Card class="grid content-between gap-1 p-4" data-slot="balance">
          <span class="text-muted-foreground text-xs">{{
            hasCompartments ? $t('statement.free-balance') : $t('statement.balance')
          }}</span>
          <CurrencyDisplay
            v-if="balance !== null"
            :value="balance"
            :signed="balance < 0"
            glued
            class="text-xl font-semibold tracking-tight"
          />
          <span v-if="hasCompartments && wallet" class="text-muted-foreground text-xs">
            {{ $t('statement.total-label') }}
            <CurrencyDisplay :value="wallet.totalBalance" :signed="wallet.totalBalance < 0" />
          </span>
          <span v-else-if="summary?.lastEntryOn" class="text-muted-foreground text-xs">
            {{ $t('statement.updated-on') }}
            <DateTimeDisplay with-time :value="summary.lastEntryOn" />
          </span>
        </Card>
        <Card class="grid content-between gap-1 p-4" data-slot="credits">
          <span class="text-muted-foreground text-xs">{{ $t('statement.credits') }}</span>
          <CurrencyDisplay
            :value="summary?.credits.total ?? 0"
            tone="income"
            glued
            class="text-xl font-semibold tracking-tight"
          />
          <span class="text-muted-foreground text-xs">
            {{
              $t(
                'statement.lines',
                { count: summary?.credits.count ?? 0 },
                summary?.credits.count ?? 0,
              )
            }}
          </span>
        </Card>
        <Card class="grid content-between gap-1 p-4" data-slot="debits">
          <span class="text-muted-foreground text-xs">{{ $t('statement.debits') }}</span>
          <CurrencyDisplay
            :value="summary?.debits.total ?? 0"
            tone="expense"
            glued
            class="text-xl font-semibold tracking-tight"
          />
          <span class="text-muted-foreground text-xs">
            {{
              $t(
                'statement.lines',
                { count: summary?.debits.count ?? 0 },
                summary?.debits.count ?? 0,
              )
            }}
          </span>
        </Card>
      </div>
      <Card class="grid gap-4 p-4" data-slot="filter-card">
        <SearchControls
          v-model:status="pageRequest.status"
          v-model:filter="pageRequest.filterText"
          :placeholder="$t('statement.search.placeholder')"
          :status-options="statusOptions"
          @on-filter-change="search()"
          @on-filter-reset="search()"
        />
        <div
          class="border-border grid grid-cols-2 items-end gap-3 border-t pt-4 lg:grid-cols-[repeat(6,minmax(0,1fr))_auto]"
          data-slot="filters"
        >
          <div class="grid min-w-0 content-start gap-2">
            <Label for="statement-from">{{ $t('statement.filters.from') }}</Label>
            <Input
              id="statement-from"
              type="date"
              class="font-mono"
              :model-value="filters.from ?? ''"
              @update:model-value="(value) => changeFilter('from', String(value))"
            />
          </div>
          <div class="grid min-w-0 content-start gap-2">
            <Label for="statement-to">{{ $t('statement.filters.to') }}</Label>
            <Input
              id="statement-to"
              type="date"
              class="font-mono"
              :model-value="filters.to ?? ''"
              @update:model-value="(value) => changeFilter('to', String(value))"
            />
          </div>
          <FilterSelect
            :label="$t('statement.filters.period')"
            :none-label="$t('statement.filters.all-periods')"
            :options="periodChoices"
            :model-value="filters.period ?? ''"
            @update:model-value="(value: string) => changeFilter('period', value)"
          />
          <FilterSelect
            :label="$t('statement.filters.origin')"
            :none-label="$t('statement.filters.all-origins')"
            :options="originChoices"
            :model-value="filters.origin ?? ''"
            @update:model-value="(value: string) => changeFilter('origin', value)"
          />
          <MoneyFilter
            id="statement-min"
            :label="$t('statement.filters.min')"
            :model-value="filters.min ?? ''"
            @update:model-value="(value: string) => changeFilter('min', value)"
          />
          <MoneyFilter
            id="statement-max"
            :label="$t('statement.filters.max')"
            :model-value="filters.max ?? ''"
            @update:model-value="(value: string) => changeFilter('max', value)"
          />
          <Button type="button" variant="ghost" :disabled="!hasFilters" @click="clearFilters()">
            <X />{{ $t('statement.filters.clear') }}
          </Button>
        </div>
      </Card>
      <ServerErrorAlert
        :messages="[...optionErrors.messages.value, ...actionErrors.messages.value]"
      />
      <ListState
        v-if="listState !== 'table'"
        :kind="listState"
        entity="statement"
        :icon="ScrollText"
        :query="pageRequest.filterText"
        :message="loadErrors.messages.value[0]"
        :copy="listCopy"
        @create="router.push({ name: 'movements.create' })"
        @clear="clearSearch()"
        @retry="reload()"
      />
      <ItemsTable
        v-else
        active-sort-icon-only
        :data="pageResponse.content"
        :total-elements="pageResponse.totalElements"
        :noun="$t('statement.list.noun', pageResponse.totalElements)"
        :columns="columns"
        :show-status="false"
        :marked-row="(entry: WalletEntryView) => entry.origin === 'REVERSAL'"
        :loading="busy"
        :current-page="pageRequest.current"
        :page-size="pageRequest.size"
        :sorted-field="pageRequest.sortField"
        :sorted-order="pageRequest.direction"
        @page-changed="onPageChange"
        @table-sorted="onTableSorted"
        @row-selected="({ data }) => openEntry(data)"
      >
        <template #cell-createdOn="{ item }">
          <DateTimeDisplay with-time class="font-mono tabular-nums" :value="item.createdOn" />
        </template>
        <template #cell-origin="{ item }">
          <OperationBadge :origin="item.origin" />
        </template>
        <template #cell-name="{ item }">
          <span class="block md:truncate" :title="entryLabel(item, t)">{{
            entryLabel(item, t)
          }}</span>
        </template>
        <template #cell-value="{ item }">
          <span class="inline-flex items-center justify-end gap-1">
            <component
              :is="item.direction === 'CREDIT' ? ArrowDownLeft : ArrowUpRight"
              :class="['size-3.5', item.direction === 'CREDIT' ? 'text-income' : 'text-expense']"
            />
            <CurrencyDisplay
              :value="item.value"
              :tone="item.direction === 'CREDIT' ? 'income' : 'expense'"
              bare
            />
          </span>
        </template>
        <template #cell-previousBalance="{ item }">
          <CurrencyDisplay
            :value="item.previousBalance"
            :signed="item.previousBalance < 0"
            bare
            glued
          />
        </template>
        <template #cell-resultingBalance="{ item }">
          <CurrencyDisplay
            :value="item.resultingBalance"
            :signed="item.resultingBalance < 0"
            bare
            glued
          />
        </template>
        <template #cell-reference="{ item }">
          <RouterLink
            v-if="isReconciled(item)"
            :to="originPath(item)!"
            :aria-label="$t('statement.open-reconciliation', { name: entryLabel(item, t) })"
            class="text-muted-foreground hover:text-foreground max-md:text-primary inline-flex items-center gap-0.5"
            @click.stop
          >
            <span class="md:hidden">{{ $t('statement.view-reconciliation') }}</span>
            <ArrowUpRight class="size-4 max-md:size-3.5" />
          </RouterLink>
          <RouterLink
            v-else-if="originPath(item)"
            :to="originPath(item)!"
            :aria-label="$t('statement.open-origin', { name: entryLabel(item, t) })"
            class="text-muted-foreground hover:text-foreground inline-flex max-md:hidden"
            @click.stop
          >
            <ArrowUpRight class="size-4" />
          </RouterLink>
          <span v-else class="text-muted-foreground max-md:hidden">—</span>
        </template>
        <template #actions="{ item }">
          <Button
            v-if="item.reference?.returnable"
            type="button"
            variant="outline"
            size="sm"
            @click="startGiveBack(item)"
          >
            <Undo2 />{{ $t('transfer.actions.give-back') }}
          </Button>
        </template>
      </ItemsTable>
    </div>
    <ReconcileDialog
      :wallet="reconciliation.target.value"
      :loading="reconciliation.loading.value"
      :messages="reconciliation.messages.value"
      :balance-change="reconciliation.balanceChange.value"
      @close="reconciliation.close()"
      @reconcile="reconciliation.reconcile"
    />
    <GiveBackDialog
      :transfer="giveBack.target.value"
      :loading="transfers.loading"
      :balance-of="giveBack.balanceOf"
      :messages="giveBack.messages.value"
      @close="giveBack.close()"
      @confirm="giveBack.confirm"
    />
  </PageContainer>
</template>
