<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { ListChecks, RefreshCw } from 'lucide-vue-next'
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
import { nextOpenPeriod } from '@/utils/movements'
import { displayedValue, isLaunchedIn, toneOf } from '@/utils/recurringMovements'

const { t, d } = useI18n()
const compact = useMediaQuery('(max-width: 767px)')
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
  sortFields: ['name'],
  defaultSort: { sortField: 'name', direction: 'asc' },
  extra: { keys: RECURRING_LAUNCH_FILTER_KEYS, values: filters },
  onExternalChange: reload,
})

const ready = optionErrors.run(openPeriods.load).then(applyDefaultPeriod)

function applyDefaultPeriod() {
  const known = openPeriods.periods.value.some((period) => period.id === filters.value.period)
  if (!known) {
    filters.value = {
      ...filters.value,
      period: nextOpenPeriod(openPeriods.periods.value)?.id ?? '',
    }
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
  {
    field: 'name',
    header: t('recurrent-movement.launch.recurring-movement'),
    mobile: 'title' as const,
  },
  {
    field: 'valueKind',
    header: t('recurrent-movement.table-columns.value-kind'),
    mobile: 'hide' as const,
  },
  {
    field: 'value',
    header: t('recurrent-movement.table-columns.value'),
    align: 'end' as const,
    mobile: 'value' as const,
  },
  {
    field: 'situation',
    header: t('recurrent-movement.table-columns.situation'),
    mobile: 'line' as const,
    mobileLabel: false,
  },
])

const nothingToLaunch = computed(
  () => pageResponse.value.content.length > 0 && pageResponse.value.content.every(isLaunchedIn),
)

function situationOf(recurringMovement: RecurringMovementView) {
  if (!isLaunchedIn(recurringMovement)) {
    return 'available'
  }
  return recurringMovement.autoLaunch ? 'launched-auto' : 'launched'
}

function situationText(recurringMovement: RecurringMovementView) {
  return situationOf(recurringMovement) === 'available'
    ? t(`recurrent-movement.value-kind.${recurringMovement.valueKind}`)
    : t(`recurrent-movement.launch.${situationOf(recurringMovement)}`)
}

function toggleRow({ data }: { data: RecurringMovementView }) {
  if (!isLaunchedIn(data)) {
    store.toggle(data, !selection.value[data.id])
  }
}

function installmentBadge(recurringMovement: RecurringMovementView) {
  const { installments, nextInstallment } = recurringMovement
  return installments == null || nextInstallment == null
    ? null
    : `${nextInstallment}/${installments}`
}

function typedValue(recurringMovement: RecurringMovementView) {
  return launchValueOf(recurringMovement, typedValues.value[recurringMovement.id])
}

function changePeriod(value: string) {
  store.clearSelection()
  filters.value = { ...filters.value, period: value }
  pageRequest.value.current = 0
  return reload()
}

function onPageChange(event: { currentPage: number; pageSize: number }) {
  pageRequest.value.size = event.pageSize
  pageRequest.value.current = event.currentPage
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
    <div class="grid grid-cols-1 gap-4 *:min-w-0">
      <Alert v-if="!initializing && openPeriods.periods.value.length === 0" variant="destructive">
        <AlertTitle>{{ $t('recurrent-movement.launch.no-open-period') }}</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center gap-3">
          {{ $t('recurrent-movement.launch.no-open-period-hint') }}
          <Button type="button" size="sm" variant="outline" @click="createPeriod()">
            {{ $t('recurrent-movement.launch.create-period') }}
          </Button>
        </AlertDescription>
      </Alert>
      <div v-else class="grid gap-3 md:grid-cols-[320px_minmax(0,1fr)] md:items-end">
        <FilterSelect
          :label="$t('recurrent-movement.launch.period')"
          :none-label="$t('recurrent-movement.launch.period-none')"
          :options="periodChoices"
          :model-value="filters.period ?? ''"
          @update:model-value="changePeriod"
        />
        <p
          v-if="selectedPeriod"
          class="text-muted-foreground pb-2.5 text-xs md:pb-2"
          data-slot="due-hint"
        >
          {{
            nothingToLaunch
              ? $t('recurrent-movement.launch.nothing-manual')
              : $t('recurrent-movement.launch.due-hint', { date: dueDateOf(selectedPeriod) })
          }}
        </p>
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
        @page-changed="onPageChange"
        @row-selected="toggleRow"
      >
        <template #cell-name="{ item }">
          <span
            :class="['inline-flex items-center gap-3', isLaunchedIn(item) && 'opacity-60']"
            data-slot="launch-name"
          >
            <Checkbox
              :aria-label="$t('recurrent-movement.launch.select', { name: item.name })"
              :disabled="isLaunchedIn(item)"
              :model-value="Boolean(selection[item.id])"
              @click.stop
              @update:model-value="(checked) => store.toggle(item, checked === true)"
            />
            <span class="font-medium">{{ item.name }}</span>
            <Badge v-if="installmentBadge(item)" variant="outline">
              {{ installmentBadge(item) }}
            </Badge>
          </span>
        </template>
        <template #cell-valueKind="{ item }">
          <span :class="isLaunchedIn(item) && 'opacity-60'">
            <RecurringValueKindBadge :value-kind="item.valueKind" />
          </span>
        </template>
        <template #cell-value="{ item }">
          <MoneyInput
            v-if="item.valueKind === 'VARIABLE' && !isLaunchedIn(item) && !compact"
            :label="$t('recurrent-movement.launch.value-of', { name: item.name })"
            :model-value="typedValue(item)"
            @update:model-value="(value) => store.type(item.id, value)"
          />
          <span v-else :class="isLaunchedIn(item) && 'opacity-60'">
            <CurrencyDisplay :value="displayedValue(item)" :tone="toneOf(item)" bare />
          </span>
        </template>
        <template #cell-situation="{ item }">
          <template v-if="compact">{{ situationText(item) }}</template>
          <Badge
            v-else
            :variant="isLaunchedIn(item) ? 'approved' : 'neutral'"
            :class="isLaunchedIn(item) && 'opacity-60'"
          >
            {{ $t(`recurrent-movement.launch.${situationOf(item)}`) }}
          </Badge>
        </template>
      </ItemsTable>
      <div
        class="bg-muted sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-5 py-3"
        data-slot="launch-bar"
      >
        <span class="text-sm">
          <template v-if="selected.length > 0">
            <b>{{
              $t('recurrent-movement.launch.selected', { count: selected.length }, selected.length)
            }}</b>
            · {{ $t('recurrent-movement.launch.effect') }}
            <CurrencyDisplay :value="effect" :signed="effect < 0" glued bare />
          </template>
          <template v-else>{{ $t('recurrent-movement.launch.none-selected') }}</template>
        </span>
        <div class="flex gap-2">
          <Button type="button" variant="outline" @mousedown.prevent @click="cancel()">{{
            $t('form.cancel')
          }}</Button>
          <Button type="button" :disabled="selected.length === 0 || loading" @click="launch()">
            <ListChecks />{{
              selected.length === 0
                ? $t('recurrent-movement.launch.submit-none')
                : $t(
                    'recurrent-movement.launch.submit',
                    { count: selected.length },
                    selected.length,
                  )
            }}
          </Button>
        </div>
      </div>
    </div>
  </PageContainer>
</template>
