<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import MoneyInput from '@/components/forms/MoneyInput.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import ListState, { type ListStateKind } from '@/components/listing/ListState.vue'
import RecurringValueKindBadge from '@/components/recurring/RecurringValueKindBadge.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useListFilters } from '@/composables/useListFilters'
import { useNotification } from '@/composables/useNotification'
import { useOpenPeriods } from '@/composables/useOpenPeriods'
import { useServerErrors } from '@/composables/useServerErrors'
import {
  launchValueOf,
  RECURRING_LAUNCH_FILTER_KEYS,
  useRecurringLaunchStore,
} from '@/stores/recurringLaunch'
import type { FinancialPeriodListView, RecurringMovementView } from '@/types'
import { defaultPeriod } from '@/utils/movements'
import { signedValue } from '@/utils/recurringMovements'

const { t, d } = useI18n()
const router = useRouter()
const { showSuccess, showWarn } = useNotification()

const store = useRecurringLaunchStore()
const { pageRequest, pageResponse, loading, filters, typedValues, selection, selected, effect } =
  storeToRefs(store)

const openPeriods = useOpenPeriods()
const optionErrors = useServerErrors()
const loadErrors = useServerErrors()
const launchErrors = useServerErrors()

const loadFailed = ref(false)
const initializing = ref(true)

const { writeRoute } = useListFilters({
  pageRequest,
  initialStatus: 'ALL',
  statuses: ['ALL'],
  sortFields: ['name', 'value'],
  extra: { keys: RECURRING_LAUNCH_FILTER_KEYS, values: filters },
  onExternalChange: reload,
})

const ready = optionErrors.run(openPeriods.load).then(applyDefaultPeriod)

function applyDefaultPeriod() {
  const known = openPeriods.periods.value.some((period) => period.id === filters.value.period)
  if (!known) {
    filters.value = { ...filters.value, period: defaultPeriod(openPeriods.periods.value)?.id ?? '' }
  }
}

async function reload() {
  await ready
  writeRoute()
  loadFailed.value = filters.value.period ? !(await loadErrors.run(store.findAll)) : false
  initializing.value = false
}

onMounted(reload)

const selectedPeriod = computed(() =>
  openPeriods.periods.value.find((period) => period.id === filters.value.period),
)
const periodChoices = computed(() =>
  openPeriods.periods.value.map((period) => ({
    value: period.id,
    label: period.expired
      ? `${period.name} · ${t('financial-period.status.expired')}`
      : period.name,
  })),
)
function dueDateOf(period: FinancialPeriodListView) {
  return d(new Date(`${period.endingAt}T00:00:00`), 'short')
}

const busy = computed(() => loading.value || initializing.value)
const listState = computed<ListStateKind | 'table'>(() => {
  if (loadFailed.value) {
    return 'error'
  }
  if (busy.value || pageResponse.value.totalElements > 0) {
    return 'table'
  }
  return 'empty'
})

const columns = computed(() => [
  { field: 'name', header: t('recurrent-movement.table-columns.name'), sortable: true },
  { field: 'valueKind', header: t('recurrent-movement.table-columns.value-kind') },
  {
    field: 'value',
    header: t('recurrent-movement.table-columns.value'),
    sortable: true,
    align: 'end' as const,
  },
  { field: 'situation', header: t('recurrent-movement.table-columns.situation') },
])

function launched(recurringMovement: RecurringMovementView) {
  return recurringMovement.launchedInPeriod !== null
}

function typedValue(recurringMovement: RecurringMovementView) {
  return launchValueOf(recurringMovement, typedValues.value[recurringMovement.id])
}

function changePeriod(value: string) {
  filters.value = { ...filters.value, period: value }
  pageRequest.value.current = 0
  return reload()
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

function cancel() {
  store.clearSelection()
  return router.push({ name: 'recurring-movements' })
}

function createPeriod() {
  return router.push({ name: 'financial-periods.create' })
}

async function launch() {
  const period = selectedPeriod.value!
  let created = 0
  let skipped = ''
  const succeeded = await launchErrors.run(async () => {
    const report = await store.launch(period.id)
    created = report.launched.length
    skipped = report.skipped
      .map((item) => `${item.name} (${t(`recurrent-movement.skipped.${item.reason}`)})`)
      .join(', ')
  })
  if (!succeeded) {
    return
  }
  showSuccess(
    'recurrent-movement.toast.launched',
    'recurrent-movement.toast.launched-detail',
    true,
    {
      count: created,
      period: period.name,
    },
  )
  if (skipped) {
    showWarn(t('recurrent-movement.toast.skipped'), skipped, false)
  }
  store.clearSelection()
  await router.push({ name: 'movements', query: { period: period.id } })
}
</script>

<template>
  <PageContainer class="gap-6">
    <PageHeader
      :title="$t('recurrent-movement.launch.title')"
      :description="$t('recurrent-movement.launch.description')"
    />
    <div class="grid gap-3">
      <Alert v-if="!initializing && openPeriods.periods.value.length === 0" variant="destructive">
        <AlertTitle>{{ $t('recurrent-movement.launch.no-open-period') }}</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center gap-3">
          {{ $t('recurrent-movement.launch.no-open-period-hint') }}
          <Button type="button" size="sm" variant="outline" @click="createPeriod()">
            {{ $t('recurrent-movement.launch.create-period') }}
          </Button>
        </AlertDescription>
      </Alert>
      <div v-else class="grid max-w-sm gap-1">
        <FilterSelect
          :label="$t('recurrent-movement.launch.period')"
          :none-label="$t('recurrent-movement.launch.period-none')"
          :options="periodChoices"
          :model-value="filters.period ?? ''"
          @update:model-value="changePeriod"
        />
        <span v-if="selectedPeriod" class="text-muted-foreground text-xs" data-slot="due-hint">
          {{ $t('recurrent-movement.launch.due-hint', { date: dueDateOf(selectedPeriod) }) }}
        </span>
      </div>
      <ServerErrorAlert
        :messages="[...optionErrors.messages.value, ...launchErrors.messages.value]"
      />
      <ListState
        v-if="listState !== 'table'"
        :kind="listState"
        entity="recurrent-movement"
        :icon="RefreshCw"
        :message="loadErrors.messages.value[0]"
        :creatable="false"
        @retry="reload()"
      />
      <ItemsTable
        v-else
        :data="pageResponse.content"
        :total-elements="pageResponse.totalElements"
        :columns="columns"
        :show-status="false"
        :loading="busy"
        :current-page="pageRequest.current"
        :page-size="pageRequest.size"
        :sorted-field="pageRequest.sortField"
        :sorted-order="pageRequest.direction"
        @page-changed="onPageChange"
        @table-sorted="onTableSorted"
      >
        <template #cell-name="{ item }">
          <span :class="['inline-flex items-center gap-2.5', launched(item) && 'opacity-60']">
            <Checkbox
              :aria-label="$t('recurrent-movement.launch.select', { name: item.name })"
              :disabled="launched(item)"
              :model-value="Boolean(selection[item.id])"
              @update:model-value="(checked) => store.toggle(item, checked === true)"
            />
            {{ item.name }}
            <Badge
              v-if="item.nextInstallment !== null && item.installments !== null"
              variant="outline"
            >
              {{ item.nextInstallment }}/{{ item.installments }}
            </Badge>
          </span>
        </template>
        <template #cell-valueKind="{ item }">
          <RecurringValueKindBadge :value-kind="item.valueKind" />
        </template>
        <template #cell-value="{ item }">
          <MoneyInput
            v-if="item.valueKind === 'VARIABLE' && !launched(item)"
            :label="$t('recurrent-movement.launch.value-of', { name: item.name })"
            :model-value="typedValue(item)"
            @update:model-value="(value) => store.type(item.id, value)"
          />
          <CurrencyDisplay v-else :value="signedValue(item)" signed />
        </template>
        <template #cell-situation="{ item }">
          <Badge :variant="launched(item) ? 'neutral' : 'approved'">
            {{
              $t(
                launched(item)
                  ? 'recurrent-movement.launch.launched'
                  : 'recurrent-movement.launch.available',
              )
            }}
          </Badge>
        </template>
      </ItemsTable>
    </div>
    <div
      class="bg-background sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-3 border-t px-1 py-3"
      data-slot="launch-bar"
    >
      <p class="text-sm">
        {{ $t('recurrent-movement.launch.selected', { count: selected.length }, selected.length) }}
        ·
        {{ $t('recurrent-movement.launch.effect') }}
        <CurrencyDisplay :value="effect" signed />
      </p>
      <div class="flex gap-2">
        <Button type="button" variant="outline" @click="cancel()">{{ $t('form.cancel') }}</Button>
        <Button type="button" :disabled="selected.length === 0 || loading" @click="launch()">
          {{ $t('recurrent-movement.launch.submit', { count: selected.length }, selected.length) }}
        </Button>
      </div>
    </div>
  </PageContainer>
</template>
