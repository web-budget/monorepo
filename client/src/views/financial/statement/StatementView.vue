<script setup lang="ts">
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ArrowUpRightFromSquare,
  Scale,
  ScrollText,
  X,
} from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import ListState from '@/components/listing/ListState.vue'
import SearchControls from '@/components/listing/SearchControls.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AdjustBalanceDialog from '@/components/wallets/AdjustBalanceDialog.vue'
import { useActiveWallets } from '@/composables/useActiveWallets'
import { useListFilters } from '@/composables/useListFilters'
import { useMovementFilterOptions } from '@/composables/useMovementFilterOptions'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { STATEMENT_FILTER_KEYS, useStatementStore, WALLET_ENTRY_ORIGINS } from '@/stores/statement'
import type { WalletEntryDirectionFilter, WalletEntryView } from '@/types'
import { typeKey } from '@/utils/typeLabels'
import { defaultWallet } from '@/utils/wallets'
import type { ListStateKind } from '@/components/listing/ListState.vue'

const { t, d, locale } = useI18n()

const store = useStatementStore()
const { pageRequest, pageResponse, loading, filters } = storeToRefs(store)

const activeWallets = useActiveWallets()
const options = useMovementFilterOptions()
const loadErrors = useServerErrors()
const optionErrors = useServerErrors()
const actionErrors = useServerErrors()
const { showSuccess } = useNotification()

const balance = ref<number | null>(null)
const adjusting = ref(false)
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
  const wallet = defaultWallet(activeWallets.wallets.value)
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
  loadFailed.value = !(await loadErrors.run(store.findAll))
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
  { field: 'createdOn', header: t('statement.table-columns.created-on'), sortable: true },
  { field: 'origin', header: t('statement.table-columns.origin'), sortable: true },
  { field: 'name', header: t('statement.table-columns.name'), sortable: true },
  {
    field: 'value',
    header: t('statement.table-columns.value'),
    sortable: true,
    align: 'end' as const,
  },
  {
    field: 'previousBalance',
    header: t('statement.table-columns.previous-balance'),
    align: 'end' as const,
  },
  {
    field: 'resultingBalance',
    header: t('statement.table-columns.resulting-balance'),
    align: 'end' as const,
  },
  { field: 'reference', header: t('statement.table-columns.reference') },
])

function formatDateTime(value: string) {
  const date = new Date(value)
  const time = date.toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })
  return `${d(date, 'short')} ${time}`
}

function signedValue(entry: WalletEntryView) {
  return entry.direction === 'CREDIT' ? entry.value : -entry.value
}

const REFERENCE_PATHS = { MOVEMENT: 'movements', TRANSFER: 'transfers' }

function referenceLink(entry: WalletEntryView) {
  return entry.reference
    ? `/financial/${REFERENCE_PATHS[entry.reference.type]}/${entry.reference.id}/detail`
    : null
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

async function adjust(target: { id: string }, form: { value: number; name: string }) {
  if (await actionErrors.run(() => store.adjust(target.id, form))) {
    adjusting.value = false
    showSuccess('statement.toast.adjusted', 'statement.toast.adjusted-detail', true, {
      name: wallet.value?.name,
    })
    await reload()
    await loadBalance()
  }
}
</script>

<template>
  <PageContainer class="gap-6">
    <PageHeader
      :title="$t('statement.title')"
      :description="wallet ? $t('statement.description', { name: wallet.name }) : undefined"
    >
      <template #actions>
        <Button as-child variant="outline">
          <RouterLink :to="{ path: '/financial/transfers/create', query: { from: wallet?.id } }">
            <ArrowLeftRight />{{ $t('statement.actions.transfer') }}
          </RouterLink>
        </Button>
        <Button
          type="button"
          variant="outline"
          :disabled="!wallet?.active || balance === null"
          @click="adjusting = true"
        >
          <Scale />{{ $t('statement.actions.adjust') }}
        </Button>
      </template>
    </PageHeader>
    <div class="grid gap-3">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card class="gap-2 p-4">
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
        <Card class="gap-1 p-4" data-slot="balance">
          <span class="text-muted-foreground text-xs">{{ $t('statement.balance') }}</span>
          <CurrencyDisplay
            v-if="balance !== null"
            :value="balance"
            :class="['text-xl font-semibold', balance < 0 && 'text-expense']"
          />
        </Card>
      </div>
      <SearchControls
        v-model:status="pageRequest.status"
        v-model:filter="pageRequest.filterText"
        :placeholder="$t('statement.search.placeholder')"
        :status-options="statusOptions"
        @on-filter-change="search()"
        @on-filter-reset="search()"
      />
      <div
        class="grid grid-cols-2 items-end gap-3 lg:grid-cols-[repeat(6,minmax(0,1fr))_auto]"
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
        <div class="grid min-w-0 content-start gap-2">
          <Label for="statement-min">{{ $t('statement.filters.min') }}</Label>
          <Input
            id="statement-min"
            type="number"
            class="font-mono"
            :model-value="filters.min ?? ''"
            @update:model-value="(value) => changeFilter('min', String(value))"
          />
        </div>
        <div class="grid min-w-0 content-start gap-2">
          <Label for="statement-max">{{ $t('statement.filters.max') }}</Label>
          <Input
            id="statement-max"
            type="number"
            class="font-mono"
            :model-value="filters.max ?? ''"
            @update:model-value="(value) => changeFilter('max', String(value))"
          />
        </div>
        <Button type="button" variant="ghost" :disabled="!hasFilters" @click="clearFilters()">
          <X />{{ $t('statement.filters.clear') }}
        </Button>
      </div>
      <ServerErrorAlert
        :messages="[...optionErrors.messages.value, ...actionErrors.messages.value]"
      />
      <ListState
        v-if="listState !== 'table'"
        :kind="listState"
        entity="statement"
        :icon="ScrollText"
        :creatable="false"
        :query="pageRequest.filterText"
        :message="loadErrors.messages.value[0]"
        @clear="clearSearch()"
        @retry="reload()"
      />
      <ItemsTable
        active-sort-icon-only
        v-else
        :data="pageResponse.content"
        :total-elements="pageResponse.totalElements"
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
      >
        <template #cell-createdOn="{ item }">
          <span class="font-mono tabular-nums">{{ formatDateTime(item.createdOn) }}</span>
        </template>
        <template #cell-origin="{ item }">
          <Badge :variant="item.origin === 'REVERSAL' ? 'pending' : 'neutral'">
            {{ $t(`statement.origin.${item.origin}`) }}
          </Badge>
        </template>
        <template #cell-value="{ item }">
          <span class="inline-flex items-center justify-end gap-1">
            <component
              :is="item.direction === 'CREDIT' ? ArrowDownLeft : ArrowUpRight"
              :class="['size-3.5', item.direction === 'CREDIT' ? 'text-income' : 'text-expense']"
            />
            <CurrencyDisplay :value="signedValue(item)" signed />
          </span>
        </template>
        <template #cell-previousBalance="{ item }">
          <CurrencyDisplay :value="item.previousBalance" />
        </template>
        <template #cell-resultingBalance="{ item }">
          <CurrencyDisplay :value="item.resultingBalance" />
        </template>
        <template #cell-reference="{ item }">
          <RouterLink
            v-if="referenceLink(item)"
            :to="referenceLink(item)!"
            :aria-label="$t('statement.open-origin', { name: item.name })"
            class="text-muted-foreground hover:text-foreground inline-flex"
          >
            <ArrowUpRightFromSquare class="size-4" />
          </RouterLink>
          <span v-else class="text-muted-foreground">—</span>
        </template>
      </ItemsTable>
    </div>
    <AdjustBalanceDialog
      :wallet="
        adjusting && wallet && balance !== null
          ? { id: wallet.id, name: wallet.name, balance }
          : null
      "
      :loading="loading"
      @close="adjusting = false"
      @adjust="adjust"
    />
  </PageContainer>
</template>
