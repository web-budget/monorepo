<script setup lang="ts">
import { storeToRefs } from 'pinia'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import { useCrudDetail } from '@/composables/useCrudDetail'
import { useCostCentersStore } from '@/stores/costCenters'

const props = defineProps<{ id: string }>()

const store = useCostCentersStore()
const { costCenter } = storeToRefs(store)

const { messages, changeToList, changeToUpdate, remove } = useCrudDetail({
  routeName: 'cost-centers',
  deletedNotice: 'notification.cost-center.deleted',
  id: () => props.id,
  findOne: store.findOne,
  remove: store.remove,
})
</script>

<template>
  <DetailCard
    :title="$t('cost-center.form.detailing')"
    :active="costCenter?.active"
    :messages="messages"
    @back="changeToList"
    @edit="changeToUpdate"
    @delete="remove"
  >
    <template v-if="costCenter">
      <DetailField :label="$t('cost-center.form.name')" :value="costCenter.name" />
      <DetailField
        :label="$t('cost-center.form.parent')"
        :value="costCenter.parentCostCenter?.fullName"
      />
      <DetailField :label="$t('cost-center.form.income-budget')">
        <CurrencyDisplay :value="costCenter.incomeBudget" zero-if-null />
      </DetailField>
      <DetailField :label="$t('cost-center.form.expense-budget')">
        <CurrencyDisplay :value="costCenter.expenseBudget" zero-if-null />
      </DetailField>
      <DetailField :label="$t('cost-center.form.description')" :value="costCenter.description" />
    </template>
  </DetailCard>
</template>
