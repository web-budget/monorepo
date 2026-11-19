<script setup lang="ts">
import { storeToRefs } from 'pinia'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import DetailSection from '@/components/common/DetailSection.vue'
import { useCrudDetail } from '@/composables/useCrudDetail'
import { useCostCentersStore } from '@/stores/costCenters'

const props = defineProps<{ id: string }>()

const store = useCostCentersStore()
const { costCenter } = storeToRefs(store)

const { messages, changeToUpdate, remove } = useCrudDetail({
  routeName: 'cost-centers',
  entity: 'cost-center',
  id: () => props.id,
  name: () => costCenter.value?.name,
  findOne: store.findOne,
  remove: store.remove,
})
</script>

<template>
  <DetailCard
    :title="costCenter?.name ?? $t('cost-center.form.detailing')"
    :description="costCenter?.parentCostCenter?.fullName"
    :active="costCenter?.active"
    :messages="messages"
    @edit="changeToUpdate"
    @delete="remove"
  >
    <template v-if="costCenter">
      <DetailSection :title="$t('cost-center.sections.identification')">
        <DetailField :label="$t('cost-center.form.name')" :value="costCenter.name" />
        <DetailField
          :label="$t('cost-center.form.parent')"
          :value="costCenter.parentCostCenter?.fullName"
        />
        <DetailField
          :label="$t('cost-center.form.description')"
          :value="costCenter.description"
          wide
        />
      </DetailSection>
      <DetailSection :title="$t('cost-center.sections.budget')">
        <DetailField :label="$t('cost-center.form.income-budget')">
          <CurrencyDisplay :value="costCenter.incomeBudget" zero-if-null />
        </DetailField>
        <DetailField :label="$t('cost-center.form.expense-budget')">
          <CurrencyDisplay :value="costCenter.expenseBudget" zero-if-null />
        </DetailField>
      </DetailSection>
    </template>
  </DetailCard>
</template>
