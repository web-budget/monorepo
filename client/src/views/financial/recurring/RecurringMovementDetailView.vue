<script setup lang="ts">
import { TrendingUp } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import DetailSection from '@/components/common/DetailSection.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import { MINIMUM_PAGE_SIZE } from '@/components/listing/itemsTable'
import ReadjustValueDialog from '@/components/recurring/ReadjustValueDialog.vue'
import RecurringInstallments from '@/components/recurring/RecurringInstallments.vue'
import RecurringStatusBadge from '@/components/recurring/RecurringStatusBadge.vue'
import RecurringValueKindBadge from '@/components/recurring/RecurringValueKindBadge.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCrudDetail } from '@/composables/useCrudDetail'
import { useReadjustValue } from '@/composables/useReadjustValue'
import { useServerErrors } from '@/composables/useServerErrors'
import { useRecurringMovementsStore } from '@/stores/recurringMovements'
import { installmentProgress, monthAndYear } from '@/utils/recurringMovements'

const props = defineProps<{ id: string }>()

const { t } = useI18n()

const store = useRecurringMovementsStore()
const { recurringMovement, values, launches, loading } = storeToRefs(store)
const historyErrors = useServerErrors()

const valuesPage = ref(0)
const valuesSize = ref(MINIMUM_PAGE_SIZE)

const title = computed(() => {
  const current = recurringMovement.value
  if (!current) {
    return t('recurrent-movement.form.detailing')
  }
  const progress = installmentProgress(current)
  return progress ? `${current.name} ${progress.current}/${progress.total}` : current.name
})

const historyStatus = ref<'loading' | 'ready' | 'failed'>('loading')

const hasReadjustments = computed(() => values.value.totalElements > 1)

const history = computed(() =>
  values.value.content.map((value, index) => ({
    ...value,
    id: String(valuesPage.value * valuesSize.value + index),
    validFromLabel: monthAndYear(value.validFromPeriod?.startingAt ?? value.validFrom),
  })),
)

const columns = computed(() => [
  {
    field: 'validFromLabel',
    header: t('recurrent-movement.history.valid-from'),
    mobile: 'title' as const,
  },
  {
    field: 'value',
    header: t('recurrent-movement.history.value'),
    align: 'end' as const,
    mobile: 'value' as const,
  },
  {
    field: 'reason',
    header: t('recurrent-movement.history.reason'),
    mobile: 'line' as const,
    mobileLabel: false,
  },
])

async function loadHistory() {
  const loaded = await historyErrors.run(() =>
    store.findValues(props.id, valuesPage.value, valuesSize.value),
  )
  historyStatus.value = loaded ? 'ready' : 'failed'
}

function loadLaunches() {
  return historyErrors.run(() => store.findLaunches(props.id))
}

async function reloadAfterReadjust() {
  valuesPage.value = 0
  await loadHistory()
}

function onHistoryPageChange(event: { currentPage: number; pageSize: number }) {
  valuesPage.value = event.currentPage
  valuesSize.value = event.pageSize
  return loadHistory()
}

const { messages, changeToUpdate, remove } = useCrudDetail({
  routeName: 'recurring-movements',
  entity: 'recurrent-movement',
  id: () => props.id,
  name: () => recurringMovement.value?.name,
  findOne: store.findOne,
  remove: store.remove,
})

const readjust = useReadjustValue(reloadAfterReadjust)

const loadedKind = computed(() =>
  recurringMovement.value?.id === props.id ? recurringMovement.value.valueKind : undefined,
)

watch(
  loadedKind,
  (kind) => {
    historyStatus.value = 'loading'
    if (kind === 'FIXED') {
      void loadHistory()
    } else if (kind === 'VARIABLE') {
      void loadLaunches()
    }
  },
  { immediate: true },
)
</script>

<template>
  <DetailCard
    :title="title"
    :messages="[...messages, ...readjust.messages.value, ...historyErrors.messages.value]"
    @edit="changeToUpdate"
    @delete="remove"
  >
    <template v-if="recurringMovement" #badge>
      <RecurringStatusBadge :ended="recurringMovement.ended" />
    </template>
    <template v-if="recurringMovement?.valueKind === 'FIXED'" #middle-actions>
      <Button type="button" variant="outline" @click="readjust.open(recurringMovement)">
        <TrendingUp />{{ $t('recurrent-movement.actions.readjust') }}
      </Button>
    </template>
    <template v-if="recurringMovement">
      <DetailSection
        :title="$t('recurrent-movement.sections.identification')"
        columns="grid-cols-2"
      >
        <DetailField
          :label="$t('recurrent-movement.detail.name')"
          :value="recurringMovement.name"
        />
        <DetailField :label="$t('recurrent-movement.detail.type')">
          <Badge :variant="recurringMovement.type === 'INCOME' ? 'approved' : 'neutral'">
            {{ $t(`movement.type.${recurringMovement.type}`) }}
          </Badge>
        </DetailField>
        <DetailField
          :label="$t('recurrent-movement.detail.cost-center')"
          :value="recurringMovement.costCenter.fullName"
        />
        <DetailField
          :label="$t('recurrent-movement.detail.classification')"
          :value="recurringMovement.classification.name"
        />
      </DetailSection>
      <DetailSection
        :title="$t('recurrent-movement.sections.value-and-repetition')"
        columns="grid-cols-2 md:grid-cols-3"
      >
        <DetailField :label="$t('recurrent-movement.detail.current-value')">
          <CurrencyDisplay :value="recurringMovement.value" class="text-base font-semibold" />
        </DetailField>
        <DetailField :label="$t('recurrent-movement.detail.value-kind')">
          <RecurringValueKindBadge :value-kind="recurringMovement.valueKind" />
        </DetailField>
        <DetailField :label="$t('recurrent-movement.detail.installments')">
          <RecurringInstallments :recurring-movement="recurringMovement" />
        </DetailField>
        <DetailField
          :label="$t('recurrent-movement.detail.launch')"
          :value="
            $t(
              recurringMovement.autoLaunch
                ? 'recurrent-movement.detail.launch-auto'
                : 'recurrent-movement.detail.launch-manual',
            )
          "
        />
        <DetailField
          :label="$t('recurrent-movement.detail.due')"
          :value="$t('recurrent-movement.detail.due-last-day')"
        />
      </DetailSection>
      <DetailSection :title="$t('recurrent-movement.sections.history')" columns="grid-cols-1">
        <div
          v-if="recurringMovement.valueKind === 'VARIABLE'"
          class="grid gap-2 text-sm"
          data-slot="suggested-value"
        >
          <p>
            {{ $t('recurrent-movement.history.suggested') }}
            <CurrencyDisplay :value="recurringMovement.suggestedValue" bare class="font-bold" />.
          </p>
          <ul
            v-if="launches.length > 0"
            class="divide-border border-border divide-y rounded-md border"
          >
            <li
              v-for="launch in launches"
              :key="launch.movement"
              class="flex justify-between px-3 py-2"
            >
              <span>{{ launch.financialPeriod.name }}</span>
              <CurrencyDisplay :value="launch.valuePaid ?? launch.value" bare />
            </li>
          </ul>
        </div>
        <ItemsTable
          v-else-if="historyStatus !== 'ready' || hasReadjustments"
          :data="historyStatus === 'ready' ? history : []"
          :total-elements="values.totalElements"
          :noun="$t('recurrent-movement.history.noun', values.totalElements)"
          :columns="columns"
          :show-status="false"
          :loading="loading || historyStatus === 'loading'"
          :current-page="valuesPage"
          :page-size="valuesSize"
          @page-changed="onHistoryPageChange"
        >
          <template #cell-validFromLabel="{ item }">
            <span class="inline-flex items-center gap-2">
              <span class="font-mono tabular-nums">{{ item.validFromLabel }}</span>
              <Badge v-if="item.current" variant="approved">
                {{ $t('recurrent-movement.history.current') }}
              </Badge>
            </span>
          </template>
          <template #cell-value="{ item }">
            <CurrencyDisplay :value="item.value" bare />
          </template>
          <template #cell-reason="{ item }">
            <span class="text-muted-foreground">{{ item.reason ?? '—' }}</span>
          </template>
        </ItemsTable>
        <p v-else class="text-muted-foreground text-sm">
          {{ $t('recurrent-movement.history.fixed') }}
        </p>
      </DetailSection>
    </template>
  </DetailCard>
  <ReadjustValueDialog
    :recurring-movement="readjust.target.value"
    :loading="loading"
    @close="readjust.close()"
    @confirm="readjust.confirm"
  />
</template>
