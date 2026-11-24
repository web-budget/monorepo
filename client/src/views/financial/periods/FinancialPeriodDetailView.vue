<script setup lang="ts">
import { ReceiptText } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import DetailSection from '@/components/common/DetailSection.vue'
import PeriodStatusBadge from '@/components/listing/PeriodStatusBadge.vue'
import { Button } from '@/components/ui/button'
import { useCrudDetail } from '@/composables/useCrudDetail'
import { useServerErrors } from '@/composables/useServerErrors'
import { useFinancialPeriodsStore } from '@/stores/financialPeriods'
import type { FinancialPeriodResultView } from '@/types'

const props = defineProps<{ id: string }>()

const store = useFinancialPeriodsStore()
const { financialPeriod } = storeToRefs(store)

const { messages, changeToUpdate, remove } = useCrudDetail({
  routeName: 'financial-periods',
  entity: 'financial-period',
  id: () => props.id,
  name: () => financialPeriod.value?.name,
  findOne: store.findOne,
  remove: store.remove,
})

const extraErrors = useServerErrors()
const periodResult = ref<FinancialPeriodResultView>()
const movementCounts = ref<{ launched: number; open: number; paid: number }>()

onMounted(async () => {
  await extraErrors.run(async () => {
    const [result, counts] = await Promise.all([
      store.findResult(props.id),
      store.findMovementCounts(props.id),
    ])
    periodResult.value = result
    movementCounts.value = counts
  })
})
</script>

<template>
  <DetailCard
    :title="financialPeriod?.name ?? $t('financial-period.form.detailing')"
    :messages="[...messages, ...extraErrors.messages.value]"
    readonly
    @edit="changeToUpdate"
    @delete="remove"
  >
    <template v-if="financialPeriod" #badge>
      <PeriodStatusBadge :status="financialPeriod.status" :expired="financialPeriod.expired" />
    </template>
    <template v-if="financialPeriod" #footer>
      <Button as-child type="button" variant="outline">
        <RouterLink :to="{ path: '/financial/movements', query: { period: id } }">
          <ReceiptText />{{ $t('financial-period.actions.view-movements') }}
        </RouterLink>
      </Button>
    </template>
    <template v-if="financialPeriod">
      <DetailSection
        :title="$t('financial-period.sections.identification')"
        columns="md:grid-cols-3"
      >
        <DetailField :label="$t('financial-period.form.name')" :value="financialPeriod.name" />
        <DetailField :label="$t('financial-period.form.status')">
          <PeriodStatusBadge :status="financialPeriod.status" :expired="financialPeriod.expired" />
        </DetailField>
        <DetailField :label="$t('financial-period.table-columns.starting-at')" mono>
          <DateTimeDisplay fix-time :value="financialPeriod.startingAt" />
        </DetailField>
        <DetailField :label="$t('financial-period.table-columns.ending-at')" mono>
          <DateTimeDisplay fix-time :value="financialPeriod.endingAt" />
        </DetailField>
        <DetailField :label="$t('financial-period.form.revenues-goal')" mono>
          <CurrencyDisplay :value="financialPeriod.revenuesGoal" zero-if-null />
        </DetailField>
        <DetailField :label="$t('financial-period.form.expenses-goal')" mono>
          <CurrencyDisplay :value="financialPeriod.expensesGoal" zero-if-null />
        </DetailField>
      </DetailSection>
      <DetailSection
        v-if="periodResult"
        :title="
          $t(
            financialPeriod.status === 'OPEN'
              ? 'financial-period.sections.result'
              : 'financial-period.sections.result-closed',
          )
        "
        columns="md:grid-cols-3"
      >
        <DetailField :label="$t('financial-period.result.revenues')">
          <CurrencyDisplay :value="periodResult.revenues" zero-if-null />
        </DetailField>
        <DetailField :label="$t('financial-period.result.expenses')">
          <CurrencyDisplay :value="periodResult.expenses" zero-if-null />
        </DetailField>
        <DetailField :label="$t('financial-period.result.result')">
          <CurrencyDisplay
            :value="periodResult.result"
            zero-if-null
            class="text-base font-semibold"
          />
        </DetailField>
      </DetailSection>
      <DetailSection
        v-if="movementCounts"
        :title="$t('financial-period.sections.movements')"
        columns="md:grid-cols-3"
      >
        <DetailField
          :label="$t('financial-period.detail.launched')"
          :value="movementCounts.launched"
          mono
        />
        <DetailField
          :label="$t('financial-period.detail.open')"
          :value="movementCounts.open"
          mono
        />
        <DetailField
          :label="$t('financial-period.detail.paid')"
          :value="movementCounts.paid"
          mono
        />
      </DetailSection>
    </template>
  </DetailCard>
</template>
