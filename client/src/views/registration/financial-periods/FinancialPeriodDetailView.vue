<script setup lang="ts">
import { storeToRefs } from 'pinia'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import DetailSection from '@/components/common/DetailSection.vue'
import PeriodStatusBadge from '@/components/listing/PeriodStatusBadge.vue'
import { useCrudDetail } from '@/composables/useCrudDetail'
import { useFinancialPeriodsStore } from '@/stores/financialPeriods'

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
</script>

<template>
  <DetailCard
    :title="financialPeriod?.name ?? $t('financial-period.form.detailing')"
    :messages="messages"
    @edit="changeToUpdate"
    @delete="remove"
  >
    <template v-if="financialPeriod" #badge>
      <PeriodStatusBadge :status="financialPeriod.status" />
    </template>
    <template v-if="financialPeriod">
      <DetailSection :title="$t('financial-period.sections.identification')">
        <DetailField :label="$t('financial-period.form.name')" :value="financialPeriod.name" />
      </DetailSection>
      <DetailSection :title="$t('financial-period.sections.dates')">
        <DetailField :label="$t('financial-period.form.starting-at')" mono>
          <DateTimeDisplay fix-time :value="financialPeriod.startingAt" />
        </DetailField>
        <DetailField :label="$t('financial-period.form.ending-at')" mono>
          <DateTimeDisplay fix-time :value="financialPeriod.endingAt" />
        </DetailField>
      </DetailSection>
      <DetailSection :title="$t('financial-period.sections.goals')">
        <DetailField :label="$t('financial-period.form.revenues-goal')">
          <CurrencyDisplay :value="financialPeriod.revenuesGoal" zero-if-null />
        </DetailField>
        <DetailField :label="$t('financial-period.form.expenses-goal')">
          <CurrencyDisplay :value="financialPeriod.expensesGoal" zero-if-null />
        </DetailField>
      </DetailSection>
    </template>
  </DetailCard>
</template>
