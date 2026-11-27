<script setup lang="ts">
import {
  Check,
  CircleAlert,
  CircleCheck,
  CloudCheck,
  ListChecks,
  Pencil,
  Trash2,
} from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { classificationsApi } from '@/api/classifications'
import { costCentersApi } from '@/api/costCenters'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ImportBulkBar from '@/components/imports/ImportBulkBar.vue'
import ImportDestination from '@/components/imports/ImportDestination.vue'
import ImportDraftTotals from '@/components/imports/ImportDraftTotals.vue'
import ImportLineBadges from '@/components/imports/ImportLineBadges.vue'
import ImportLineDetail from '@/components/imports/ImportLineDetail.vue'
import ImportLineDialog from '@/components/imports/ImportLineDialog.vue'
import ImportLineValue from '@/components/imports/ImportLineValue.vue'
import ImportStatusBadge from '@/components/imports/ImportStatusBadge.vue'
import UnlinkedRecurringDialog from '@/components/imports/UnlinkedRecurringDialog.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import ListState, { type ListStateKind } from '@/components/listing/ListState.vue'
import SearchControls from '@/components/listing/SearchControls.vue'
import type { StatusOption } from '@/components/listing/statusOptions'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useActiveWallets } from '@/composables/useActiveWallets'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useListFilters } from '@/composables/useListFilters'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { LINE_STATUSES, useImportsStore } from '@/stores/imports'
import { markHandled } from '@/utils/handledErrors'
import { bareAmount } from '@/utils/reconciliation'
import type {
  ClassificationListView,
  CostCenterListView,
  ImportAction,
  ImportCompartmentRejection,
  ImportLineStatusFilter,
  ImportLineView,
} from '@/types'
import { actionsOf, isIncoming, rejectionsOf, timeOf } from '@/utils/imports'
import { dayAndMonth } from '@/utils/invoices'

const OPTIONS_PAGE_SIZE = 100

const props = defineProps<{ id: string }>()

const { t, n, locale } = useI18n()
const router = useRouter()
const { showSuccess } = useNotification()
const { confirm } = useConfirmDialog()

const store = useImportsStore()
const { current, lineRequest, lineResponse, loading } = storeToRefs(store)

const loadErrors = useServerErrors()
const optionErrors = useServerErrors()
const actionErrors = useServerErrors()
const activeWallets = useActiveWallets()

const costCenters = ref<CostCenterListView[]>([])
const classifications = ref<ClassificationListView[]>([])
const loadFailed = ref(false)
const initializing = ref(true)
const editing = ref<ImportLineView | null>(null)
const showingRecurring = ref(false)
const selected = ref<Record<string, ImportLineView>>({})
const rejections = ref<Record<string, ImportCompartmentRejection>>({})

const statusOptions: StatusOption<ImportLineStatusFilter>[] = [
  { label: 'imports.draft.tabs.PENDING', value: 'PENDING' },
  { label: 'imports.draft.tabs.IGNORED', value: 'IGNORED' },
  { label: 'imports.draft.tabs.ALL', value: 'ALL' },
]

const { writeRoute } = useListFilters({
  pageRequest: lineRequest,
  initialStatus: 'PENDING',
  statuses: LINE_STATUSES,
  sortFields: [],
  defaultSort: { sortField: 'postedOn', direction: 'asc' },
  onExternalChange: reload,
})

const ready = optionErrors.run(async () => {
  const [costCenterPage, classificationPage] = await Promise.all([
    costCentersApi.findAll({ status: 'ACTIVE', size: OPTIONS_PAGE_SIZE, sort: 'name,asc' }),
    classificationsApi.findAll({ status: 'ACTIVE', size: OPTIONS_PAGE_SIZE, sort: 'name,asc' }),
    activeWallets.load(),
  ])
  costCenters.value = costCenterPage.content
  classifications.value = classificationPage.content
})

const item = computed(() => (current.value?.id === props.id ? current.value : null))
const transferWallets = computed(() =>
  activeWallets.wallets.value.filter((wallet) => wallet.id !== item.value!.wallet?.id),
)
const statusCounts = computed(() => ({
  PENDING: item.value!.totals.pending,
  IGNORED: item.value!.totals.ignored,
  ALL: item.value!.totals.lines,
}))
const busy = computed(() => loading.value || initializing.value)
const savedAt = computed(() =>
  timeOf(item.value!.lastUpdate ?? item.value!.createdOn, locale.value),
)
const pending = computed(() => item.value!.totals.pending)
const visible = computed(() => lineResponse.value.content)
const rejected = computed(() => Object.values(rejections.value))
const selectedLines = computed(() => Object.values(selected.value))
const allVisible = computed(
  () => visible.value.length > 0 && visible.value.every((line) => line.id in selected.value),
)
const someVisible = computed(() => visible.value.some((line) => line.id in selected.value))
const allState = computed(() =>
  allVisible.value ? true : someVisible.value ? 'indeterminate' : false,
)

const listState = computed<ListStateKind | 'table'>(() => {
  if (loadFailed.value) {
    return 'error'
  }
  return busy.value || lineResponse.value.totalElements > 0 ? 'table' : 'no-result'
})
const listCopy = computed(() => {
  const searching = lineRequest.value.filterText !== ''
  return {
    errorDescription: loadErrors.messages.value[0],
    noResultQuery: t('imports.draft.list.no-result-query', { query: lineRequest.value.filterText }),
    noResultFilter: t(
      lineRequest.value.status === 'PENDING'
        ? 'imports.draft.list.none-pending'
        : 'imports.draft.list.none-ignored',
    ),
    noResultHint: searching ? t('imports.draft.list.no-result-hint') : '',
    noResultAction: t(
      searching ? 'imports.draft.list.clear-search' : 'imports.draft.list.show-all',
    ),
  }
})

const columns = computed(() => [
  { field: 'select', header: t('imports.draft.select-visible'), mobile: 'hide' as const },
  {
    field: 'postedOn',
    header: t('imports.draft.columns.date'),
    mobile: 'line' as const,
    mobileLabel: false,
    mono: true,
  },
  {
    field: 'name',
    header: t('imports.draft.columns.name'),
    mobile: 'title' as const,
    class: 'whitespace-normal',
  },
  {
    field: 'value',
    header: t('imports.draft.columns.value'),
    align: 'end' as const,
    mobile: 'value' as const,
  },
  {
    field: 'action',
    header: t('imports.draft.columns.action'),
    mobile: 'line' as const,
    mobileLabel: false,
  },
  {
    field: 'detail',
    header: t('imports.draft.columns.detail'),
    mobile: 'line' as const,
    mobileLabel: false,
    class: 'whitespace-normal',
  },
  { field: 'edit', header: t('form.edit'), srOnly: true, mobile: 'hide' as const, class: 'w-0' },
])

async function reload() {
  await ready
  writeRoute()
  loadFailed.value = !(await loadErrors.run(async () => {
    const loaded = await store.findOne(props.id)
    if (loaded.status !== 'READY') {
      await router.replace({ name: 'imports.detail', params: { id: props.id } })
      return
    }
    await store.findLines(props.id)
  }))
  initializing.value = false
}

onMounted(reload)

function search() {
  lineRequest.value.current = 0
  return reload()
}

function showAll() {
  lineRequest.value.status = 'ALL'
  lineRequest.value.filterText = ''
  return search()
}

function clearSearch() {
  lineRequest.value.filterText = ''
  return search()
}

function onListAction() {
  return lineRequest.value.filterText === '' ? showAll() : clearSearch()
}

function onPageChange(event: { currentPage: number; pageSize: number }) {
  lineRequest.value.size = event.pageSize
  lineRequest.value.current = event.currentPage
  return reload()
}

function isSelected(line: ImportLineView) {
  return line.id in selected.value
}

function toggle(line: ImportLineView) {
  if (isSelected(line)) {
    selected.value = Object.fromEntries(
      Object.entries(selected.value).filter(([id]) => id !== line.id),
    )
  } else {
    selected.value = { ...selected.value, [line.id]: line }
  }
}

function toggleVisible() {
  const next = { ...selected.value }
  for (const line of visible.value) {
    if (allVisible.value) {
      delete next[line.id]
    } else {
      next[line.id] = line
    }
  }
  selected.value = next
}

function clearSelection() {
  selected.value = {}
}

function accepts(
  line: ImportLineView,
  change: { action?: ImportAction; classification?: string },
): boolean {
  const type = classifications.value.find((entry) => entry.id === change.classification)?.type
  const actionAllowed = change.action === undefined || line.allowedActions.includes(change.action)
  const typeAllowed = type === undefined || type === (isIncoming(line) ? 'INCOME' : 'EXPENSE')
  return actionAllowed && typeAllowed
}

async function applyBulk(change: {
  action?: ImportAction
  costCenter?: string
  classification?: string
}) {
  const accepted = selectedLines.value.filter((line) => accepts(line, change))
  const skipped = selectedLines.value.length - accepted.length
  const done = await actionErrors.run(async () => {
    if (accepted.length > 0) {
      await store.updateLines(props.id, { lines: accepted.map((line) => line.id), ...change })
    }
  })
  if (done) {
    showSuccess(
      t('imports.draft.bulk.changed', accepted.length),
      skipped > 0 ? t('imports.draft.bulk.skipped', skipped) : undefined,
      false,
    )
    clearSelection()
    await reload()
  }
}

async function closeLine(changed: boolean) {
  const line = editing.value!
  editing.value = null
  if (changed) {
    rejections.value = Object.fromEntries(
      Object.entries(rejections.value).filter(([id]) => id !== line.id),
    )
    await reload()
  }
}

async function save() {
  rejections.value = {}
  let done = false
  try {
    actionErrors.clear()
    await store.save(props.id)
    done = true
  } catch (error) {
    const refused = rejectionsOf(error)
    if (refused) {
      markHandled(error)
      rejections.value = Object.fromEntries(refused.map((line) => [line.id, line]))
      lineRequest.value.status = 'ALL'
      lineRequest.value.current = 0
      await reload()
    } else {
      await actionErrors.run(() => Promise.reject(error))
    }
  }
  if (done) {
    showSuccess('imports.draft.saved')
    await router.push({ name: 'imports.detail', params: { id: props.id } })
  }
}

async function discard() {
  const confirmed = await confirm({
    destructive: true,
    title: t('imports.draft.discard.title'),
    description: t('imports.draft.discard.description'),
    confirmLabel: t('imports.draft.discard.confirm'),
  })
  if (!confirmed) {
    return
  }
  const done = await actionErrors.run(() => store.remove(props.id))
  if (done) {
    showSuccess('imports.draft.discard.done')
    await router.push({ name: 'imports' })
  }
}
</script>

<template>
  <PageContainer class="gap-5">
    <ServerErrorAlert
      :messages="[...optionErrors.messages.value, ...actionErrors.messages.value]"
    />
    <Alert v-if="rejected.length > 0" variant="destructive" data-slot="save-rejections">
      <CircleAlert />
      <AlertTitle>{{ $t('imports.draft.save-error') }}</AlertTitle>
      <AlertDescription>
        <ul class="grid gap-1">
          <li v-for="line in rejected" :key="line.id">
            {{
              $t('imports.draft.balance-exceeded', {
                date: dayAndMonth(line.postedOn),
                compartment: line.compartment,
                balance: bareAmount(line.balance, n),
              })
            }}
          </li>
        </ul>
      </AlertDescription>
    </Alert>
    <template v-if="item">
      <PageHeader :title="item.fileName">
        <template #badge><ImportStatusBadge :status="item.status" /></template>
        <template #actions>
          <span
            class="text-muted-foreground flex h-9 items-center gap-1.5 text-xs"
            data-slot="saved-at"
          >
            <CloudCheck class="size-4" />{{ $t('imports.draft.saved-at', { time: savedAt }) }}
          </span>
        </template>
      </PageHeader>
      <p class="text-muted-foreground -mt-3 flex flex-wrap items-center gap-1.5 text-sm">
        <ImportDestination :source="item" />· {{ item.financialPeriod.name }} ·
        {{ $t('imports.draft.sent-on') }}
        <DateTimeDisplay with-time :value="item.createdOn" />
      </p>
      <ImportDraftTotals :item="item" @show-recurring="showingRecurring = true" />
      <Card class="grid gap-4 p-4">
        <SearchControls
          v-model:status="lineRequest.status"
          v-model:filter="lineRequest.filterText"
          :placeholder="$t('imports.draft.search')"
          :status-options="statusOptions"
          :counts="statusCounts"
          @on-filter-change="search()"
          @on-filter-reset="search()"
        />
        <ImportBulkBar
          v-if="selectedLines.length > 0"
          :count="selectedLines.length"
          :actions="actionsOf(item.target)"
          :cost-centers="costCenters"
          :classifications="classifications"
          :busy="loading"
          @apply="applyBulk"
          @clear="clearSelection()"
        />
      </Card>
      <ListState
        v-if="listState !== 'table'"
        :kind="listState"
        entity="imports"
        :icon="ListChecks"
        :query="lineRequest.filterText"
        :copy="listCopy"
        @clear="onListAction()"
        @retry="reload()"
      />
      <ItemsTable
        v-else
        :data="lineResponse.content"
        :total-elements="lineResponse.totalElements"
        :noun="$t('imports.draft.noun', lineResponse.totalElements)"
        :columns="columns"
        :show-status="false"
        :marked-row="(line: ImportLineView) => line.pending.length > 0 || line.id in rejections"
        :loading="busy"
        :current-page="lineRequest.current"
        :page-size="lineRequest.size"
        @page-changed="onPageChange"
        @row-selected="({ data }) => (editing = data)"
      >
        <template #header-select>
          <Checkbox
            :model-value="allState"
            :aria-label="$t('imports.draft.select-visible')"
            @update:model-value="toggleVisible()"
          />
        </template>
        <template #before-cards>
          <div
            class="text-muted-foreground border-border flex items-center gap-2.5 border-b px-3.5 py-2 text-xs"
          >
            <Checkbox
              :model-value="allState"
              :aria-label="$t('imports.draft.select-visible')"
              @update:model-value="toggleVisible()"
            />
            {{ $t('imports.draft.select-all') }}
          </div>
        </template>
        <template #cell-select="{ item: line }">
          <span class="inline-flex" @click.stop>
            <Checkbox
              :model-value="isSelected(line)"
              :aria-label="$t('imports.draft.select-line', { name: line.name })"
              @update:model-value="toggle(line)"
            />
          </span>
        </template>
        <template #cell-postedOn="{ item: line }">
          {{ dayAndMonth(line.postedOn) }}
        </template>
        <template #cell-name="{ item: line, compact }">
          <div class="flex items-start gap-2.5">
            <span v-if="compact" class="mt-0.5 inline-flex" @click.stop>
              <Checkbox
                :model-value="isSelected(line)"
                :aria-label="$t('imports.draft.select-line', { name: line.name })"
                @update:model-value="toggle(line)"
              />
            </span>
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="font-medium">{{ line.name }}</span>
              <ImportLineBadges :line="line" :balance-error="rejections[line.id]?.compartment" />
            </div>
          </div>
        </template>
        <template #cell-value="{ item: line }">
          <ImportLineValue :value="line.value" bare />
        </template>
        <template #cell-action="{ item: line }">
          {{ $t(`imports.draft.actions.${line.action}`) }}
        </template>
        <template #cell-detail="{ item: line }">
          <ImportLineDetail :line="line" :period-id="item.financialPeriod.id" />
        </template>
        <template #cell-edit="{ item: line }">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            :aria-label="$t('form.edit')"
            @click.stop="editing = line"
          >
            <Pencil />
          </Button>
        </template>
      </ItemsTable>
      <Card
        class="bg-muted sticky bottom-0 z-10 flex flex-row flex-wrap items-center justify-between gap-3 px-4 py-3"
        data-slot="draft-footer"
      >
        <span class="text-sm" data-slot="draft-status">
          <span v-if="pending > 0" class="font-medium">
            {{ $t('imports.draft.pending', pending) }}
          </span>
          <span v-else class="inline-flex items-center gap-1.5 font-medium">
            <CircleCheck class="text-income size-4" />{{ $t('imports.draft.all-resolved') }}
          </span>
        </span>
        <div class="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            class="text-destructive hover:text-destructive"
            :disabled="loading"
            @click="discard()"
          >
            <Trash2 />{{ $t('imports.draft.discard.action') }}
          </Button>
          <Button
            type="button"
            :disabled="pending > 0 || loading"
            :title="pending > 0 ? $t('imports.draft.save-blocked', pending) : undefined"
            @click="save()"
          >
            <Check />{{ $t('imports.draft.save') }}
          </Button>
        </div>
      </Card>
      <ImportLineDialog
        :import-id="id"
        :period-id="item.financialPeriod.id"
        :line="editing"
        :cost-centers="costCenters"
        :classifications="classifications"
        :wallets="transferWallets"
        :balance-error="editing ? rejections[editing.id]?.compartment : undefined"
        @close="closeLine"
      />
      <UnlinkedRecurringDialog
        :open="showingRecurring"
        :items="item.warnings.unlinkedRecurring"
        @close="showingRecurring = false"
      />
    </template>
  </PageContainer>
</template>
