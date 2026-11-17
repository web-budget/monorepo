<script setup lang="ts">
import { storeToRefs } from 'pinia'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import PeriodStatusBadge from '@/components/listing/PeriodStatusBadge.vue'
import { useCrudDetail } from '@/composables/useCrudDetail'
import { useFinancialPeriodsStore } from '@/stores/financialPeriods'

const props = defineProps<{ id: string }>()

const store = useFinancialPeriodsStore()
const { financialPeriod } = storeToRefs(store)

const { messages, changeToList, changeToUpdate, remove } = useCrudDetail({
  routeName: 'financial-periods',
  deletedNotice: 'notification.financial-period.deleted',
  id: () => props.id,
  findOne: store.findOne,
  remove: store.remove,
})
</script>

<template>
  <DetailCard
    :title="$t('financial-period.form.detailing')"
    :messages="messages"
    @back="changeToList"
    @edit="changeToUpdate"
    @delete="remove"
  >
    <template v-if="financialPeriod">
      <DetailField :label="$t('financial-period.table-columns.status')">
        <PeriodStatusBadge :status="financialPeriod.status" />
      </DetailField>
      <DetailField :label="$t('financial-period.form.name')" :value="financialPeriod.name" />
      <DetailField :label="$t('financial-period.form.starting-at')">
        <DateTimeDisplay fix-time :value="financialPeriod.startingAt" />
      </DetailField>
      <DetailField :label="$t('financial-period.form.ending-at')">
        <DateTimeDisplay fix-time :value="financialPeriod.endingAt" />
      </DetailField>
      <DetailField :label="$t('financial-period.form.revenues-goal')">
        <CurrencyDisplay :value="financialPeriod.revenuesGoal" zero-if-null />
      </DetailField>
      <DetailField :label="$t('financial-period.form.expenses-goal')">
        <CurrencyDisplay :value="financialPeriod.expensesGoal" zero-if-null />
      </DetailField>
    </template>
  </DetailCard>
</template>
