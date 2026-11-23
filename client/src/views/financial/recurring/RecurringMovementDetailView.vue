<script setup lang="ts">
import { TrendingUp } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import DetailSection from '@/components/common/DetailSection.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import { MINIMUM_PAGE_SIZE } from '@/components/listing/itemsTable'
import ReadjustValueDialog from '@/components/recurring/ReadjustValueDialog.vue'
import RecurringStatusBadge from '@/components/recurring/RecurringStatusBadge.vue'
import RecurringValueKindBadge from '@/components/recurring/RecurringValueKindBadge.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCrudDetail } from '@/composables/useCrudDetail'
import { useReadjustValue } from '@/composables/useReadjustValue'
import { useServerErrors } from '@/composables/useServerErrors'
import { useRecurringMovementsStore } from '@/stores/recurringMovements'
import type { RecurringMovementView } from '@/types'
import { installmentProgress } from '@/utils/recurringMovements'

const props = defineProps<{ id: string }>()

const { t } = useI18n()

const store = useRecurringMovementsStore()
const { recurringMovement, values, loading } = storeToRefs(store)
const historyErrors = useServerErrors()

const valuesPage = ref(0)
const valuesSize = ref(MINIMUM_PAGE_SIZE)

function titleOf(view: RecurringMovementView) {
  const progress = installmentProgress(view)
  return progress ? `${view.name} ${progress.current}/${progress.total}` : view.name
}

function installmentsOf(view: RecurringMovementView) {
  const progress = installmentProgress(view)
  return progress
    ? `${progress.current}/${progress.total}`
    : t('recurrent-movement.installments.indefinite')
}

const title = computed(() =>
  recurringMovement.value
    ? titleOf(recurringMovement.value)
    : t('recurrent-movement.form.detailing'),
)

const history = computed(() =>
  values.value.content.map((value, index) => ({
    ...value,
    id: String(valuesPage.value * valuesSize.value + index),
    current: valuesPage.value === 0 && index === 0,
  })),
)

const columns = computed(() => [
  { field: 'validFrom', header: t('recurrent-movement.history.valid-from') },
  { field: 'value', header: t('recurrent-movement.history.value'), align: 'end' as const },
  { field: 'reason', header: t('recurrent-movement.history.reason') },
])

function loadHistory() {
  return historyErrors.run(() => store.findValues(props.id, valuesPage.value, valuesSize.value))
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

onMounted(loadHistory)
</script>

<template>
  <DetailCard
    :title="title"
    :messages="[...messages, ...readjust.messages.value, ...historyErrors.messages.value]"
    @edit="changeToUpdate"
    @delete="remove"
  >
    <template v-if="recurringMovement" #badge>
      <RecurringStatusBadge
        :active="recurringMovement.active"
        :finished="recurringMovement.finished"
      />
    </template>
    <template v-if="recurringMovement?.valueKind === 'FIXED'" #extra-actions>
      <Button type="button" variant="outline" @click="readjust.open(recurringMovement)">
        <TrendingUp />{{ $t('recurrent-movement.actions.readjust') }}
      </Button>
    </template>
    <template v-if="recurringMovement">
      <DetailSection
        :title="$t('recurrent-movement.sections.identification')"
        columns="md:grid-cols-3"
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
        <DetailField
          v-if="recurringMovement.card"
          :label="$t('recurrent-movement.detail.card')"
          :value="recurringMovement.card.name"
        />
      </DetailSection>
      <DetailSection
        :title="$t('recurrent-movement.sections.value-and-repetition')"
        columns="md:grid-cols-3"
      >
        <DetailField :label="$t('recurrent-movement.detail.current-value')">
          <CurrencyDisplay :value="recurringMovement.value" />
        </DetailField>
        <DetailField :label="$t('recurrent-movement.detail.value-kind')">
          <RecurringValueKindBadge :value-kind="recurringMovement.valueKind" />
        </DetailField>
        <DetailField
          :label="$t('recurrent-movement.detail.installments')"
          :value="installmentsOf(recurringMovement)"
          mono
        />
        <DetailField
          :label="$t('recurrent-movement.detail.launch')"
          :value="
            $t(
              recurringMovement.autoLaunch
                ? 'recurrent-movement.launch.auto'
                : 'recurrent-movement.launch.manual',
            )
          "
        />
        <DetailField
          :label="$t('recurrent-movement.detail.due')"
          :value="$t('recurrent-movement.detail.due-last-day')"
        />
      </DetailSection>
      <DetailSection :title="$t('recurrent-movement.sections.history')" columns="grid-cols-1">
        <p
          v-if="recurringMovement.valueKind === 'VARIABLE'"
          class="text-muted-foreground text-sm"
          data-slot="suggested-value"
        >
          {{ $t('recurrent-movement.history.suggested') }}
          <CurrencyDisplay :value="recurringMovement.suggestedValue" />.
        </p>
        <ItemsTable
          :data="history"
          :total-elements="values.totalElements"
          :columns="columns"
          :show-status="false"
          :loading="loading"
          :current-page="valuesPage"
          :page-size="valuesSize"
          @page-changed="onHistoryPageChange"
        >
          <template #cell-validFrom="{ item }">
            <span class="inline-flex items-center gap-2">
              <DateTimeDisplay :value="item.validFrom" class="font-mono tabular-nums" />
              <Badge v-if="item.current" variant="approved">
                {{ $t('recurrent-movement.history.current') }}
              </Badge>
            </span>
          </template>
          <template #cell-value="{ item }">
            <CurrencyDisplay :value="item.value" />
          </template>
          <template #cell-reason="{ item }">
            <span class="text-muted-foreground">{{ item.reason ?? '—' }}</span>
          </template>
        </ItemsTable>
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
