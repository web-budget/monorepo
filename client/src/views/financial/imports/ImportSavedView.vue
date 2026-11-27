<script setup lang="ts">
import { ArrowUpRight, FileUp, ListChecks, Lock, SearchX, Undo2 } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ImportDestination from '@/components/imports/ImportDestination.vue'
import ImportLineResult from '@/components/imports/ImportLineResult.vue'
import ImportLineValue from '@/components/imports/ImportLineValue.vue'
import ImportStatusBadge from '@/components/imports/ImportStatusBadge.vue'
import ImportUndoDialog from '@/components/imports/ImportUndoDialog.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import ListState from '@/components/listing/ListState.vue'
import StatusTabs from '@/components/listing/StatusTabs.vue'
import type { StatusOption } from '@/components/listing/statusOptions'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useListFilters } from '@/composables/useListFilters'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { RESULT_STATUSES, useImportsStore } from '@/stores/imports'
import type { ImportBlocker, ImportLineView, ImportResultFilter, ImportView } from '@/types'
import { resultTarget, retryQuery } from '@/utils/imports'
import { periodMonth } from '@/utils/invoices'

const props = defineProps<{ item: ImportView }>()

const { t, te } = useI18n()
const router = useRouter()
const { showSuccess } = useNotification()

const store = useImportsStore()
const { resultRequest, resultResponse, loading } = storeToRefs(store)

const loadErrors = useServerErrors()
const undoErrors = useServerErrors()
const refreshErrors = useServerErrors()

const loadFailed = ref(false)
const initializing = ref(true)
const undoing = ref(false)

const { writeRoute } = useListFilters({
  pageRequest: resultRequest,
  initialStatus: 'CREATED',
  statuses: RESULT_STATUSES,
  sortFields: [],
  defaultSort: { sortField: 'postedOn', direction: 'asc' },
  onExternalChange: reload,
})

const card = computed(() => props.item.target === 'CARD')
const undone = computed(() => props.item.status === 'UNDONE')
const blocked = computed(() => props.item.undoBlockers.length > 0)
const third = computed(() => (card.value ? 'recurring' : 'transfers'))
const busy = computed(() => loading.value || initializing.value)

const tabOptions = computed<StatusOption<ImportResultFilter>[]>(() => [
  { label: 'imports.saved.tabs.CREATED', value: 'CREATED' },
  { label: 'imports.saved.tabs.LINKED', value: 'LINKED' },
  card.value
    ? { label: 'imports.saved.tabs.RECURRING', value: 'RECURRING' }
    : { label: 'imports.saved.tabs.TRANSFERS', value: 'TRANSFERS' },
  { label: 'imports.saved.tabs.IGNORED', value: 'IGNORED' },
  { label: 'imports.saved.tabs.ALL', value: 'ALL' },
])
const tabCounts = computed(() => {
  const { created, linked, recurring, transfers, ignored } = props.item.result
  return {
    CREATED: created,
    LINKED: linked,
    RECURRING: recurring,
    TRANSFERS: transfers,
    IGNORED: ignored,
    ALL: created + linked + recurring + transfers + ignored,
  }
})
const cards = computed(() => [
  { key: 'created', value: props.item.result.created },
  { key: 'linked', value: props.item.result.linked },
  { key: third.value, value: props.item.result[third.value] },
  { key: 'ignored', value: props.item.result.ignored },
])
const columns = computed(() => [
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
    field: 'result',
    header: t('imports.saved.columns.result'),
    mobile: 'line' as const,
    mobileLabel: false,
    class: 'whitespace-normal',
  },
  { field: 'open', header: t('imports.saved.columns.open'), srOnly: true, mobile: 'hide' as const },
])
const listState = computed(() => {
  if (loadFailed.value) {
    return 'error'
  }
  return busy.value || resultResponse.value.totalElements > 0 ? 'table' : 'empty'
})

function blockerText(blocker: ImportBlocker): string {
  const key = `imports.saved.blockers.${blocker.reason}`
  return t(te(key) ? key : 'imports.saved.blockers.unknown', {
    name: blocker.name,
    position: blocker.position,
    period: props.item.financialPeriod.name,
    card: props.item.card?.name,
  })
}

async function reload() {
  writeRoute()
  loadFailed.value = !(await loadErrors.run(() => store.findResults(props.item.id)))
  initializing.value = false
}

onMounted(reload)

function selectTab(status: string) {
  resultRequest.value.status = status as ImportResultFilter
  resultRequest.value.current = 0
  return reload()
}

function onPageChange(event: { currentPage: number; pageSize: number }) {
  resultRequest.value.size = event.pageSize
  resultRequest.value.current = event.currentPage
  return reload()
}

function importAgain() {
  return router.push({ name: 'imports.create', query: retryQuery(props.item) })
}

function openUndo() {
  undoErrors.clear()
  undoing.value = true
}

async function undo() {
  const done = await undoErrors.run(() => store.undo(props.item.id))
  if (done) {
    undoing.value = false
    showSuccess(
      'imports.saved.undone',
      card.value ? 'imports.saved.undone-card' : 'imports.saved.undone-wallet',
      true,
      { period: periodMonth(props.item.financialPeriod.name), wallet: props.item.wallet?.name },
    )
  } else {
    await refreshErrors.run(() => store.findOne(props.item.id, true))
  }
}

function openable(line: ImportLineView) {
  return undone.value ? null : resultTarget(line)
}
</script>

<template>
  <PageHeader :title="item.fileName">
    <template #badge><ImportStatusBadge :status="item.status" /></template>
    <template #actions>
      <Button v-if="undone" type="button" variant="outline" @click="importAgain()">
        <FileUp />{{ $t('imports.detail.retry') }}
      </Button>
      <Button v-else type="button" variant="outline" :disabled="blocked" @click="openUndo()">
        <Undo2 />{{ $t('imports.saved.undo.action') }}
      </Button>
    </template>
  </PageHeader>
  <p class="text-muted-foreground -mt-3 flex flex-wrap items-center gap-1.5 text-sm">
    <ImportDestination :source="item" />· {{ item.financialPeriod.name }} ·
    {{ $t('imports.saved.saved-on') }}
    <DateTimeDisplay v-if="item.savedOn" with-time :value="item.savedOn" />
  </p>
  <Alert v-if="undone" data-slot="undone-alert">
    <Undo2 />
    <AlertTitle>
      {{ $t('imports.saved.undone-on') }}
      <DateTimeDisplay v-if="item.undoneOn" with-time :value="item.undoneOn" />
    </AlertTitle>
  </Alert>
  <Alert v-else-if="blocked" variant="attention" data-slot="undo-blocked">
    <Lock />
    <AlertTitle>{{ $t('imports.saved.blocked') }}</AlertTitle>
    <AlertDescription>
      <ul class="text-foreground mt-1 grid list-disc gap-1 pl-4">
        <li v-for="(blocker, index) in item.undoBlockers" :key="index">
          {{ blockerText(blocker) }}
        </li>
      </ul>
    </AlertDescription>
  </Alert>
  <div class="grid grid-cols-2 gap-3 xl:grid-cols-4" data-slot="saved-totals">
    <Card
      v-for="summary in cards"
      :key="summary.key"
      class="grid content-start gap-1 p-4"
      :data-slot="`total-${summary.key}`"
    >
      <span class="text-muted-foreground text-xs">{{ $t(`imports.saved.cards.${summary.key}`) }}</span>
      <span class="font-mono text-xl font-semibold tracking-tight tabular-nums md:text-2xl">
        {{ summary.value }}
      </span>
    </Card>
  </div>
  <Card class="p-4">
    <StatusTabs
      :status="resultRequest.status"
      :options="tabOptions"
      :counts="tabCounts"
      @select="selectTab"
    />
  </Card>
  <ListState
    v-if="listState === 'error'"
    kind="error"
    entity="imports"
    :icon="ListChecks"
    :message="loadErrors.messages.value[0]"
    @retry="reload()"
  />
  <Card
    v-else-if="listState === 'empty'"
    class="grid justify-items-center gap-2 px-6 py-14 text-center"
    data-state="no-result"
    role="status"
  >
    <span class="bg-muted text-muted-foreground grid size-11 place-content-center rounded-md">
      <SearchX class="size-6" />
    </span>
    <p class="font-medium">{{ $t('imports.saved.none') }}</p>
  </Card>
  <ItemsTable
    v-else
    :data="resultResponse.content"
    :total-elements="resultResponse.totalElements"
    :noun="$t('imports.draft.noun', resultResponse.totalElements)"
    :columns="columns"
    :show-status="false"
    :loading="busy"
    :current-page="resultRequest.current"
    :page-size="resultRequest.size"
    @page-changed="onPageChange"
  >
    <template #cell-postedOn="{ item: line }">
      <DateTimeDisplay fix-time :value="line.postedOn" />
    </template>
    <template #cell-name="{ item: line }">{{ line.name }}</template>
    <template #cell-value="{ item: line }">
      <ImportLineValue :value="line.value" bare />
    </template>
    <template #cell-result="{ item: line }">
      <ImportLineResult :line="line" :target="item.target" :period-id="item.financialPeriod.id" />
    </template>
    <template #cell-open="{ item: line }">
      <RouterLink
        v-if="openable(line)"
        :to="openable(line)!"
        class="text-muted-foreground hover:text-foreground inline-flex"
        :aria-label="$t('imports.saved.open', { name: line.name })"
        @click.stop
      >
        <ArrowUpRight class="size-4" />
      </RouterLink>
    </template>
  </ItemsTable>
  <ImportUndoDialog
    :open="undoing"
    :item="item"
    :messages="undoErrors.messages.value"
    :loading="loading"
    @close="undoing = false"
    @confirm="undo()"
  />
</template>
