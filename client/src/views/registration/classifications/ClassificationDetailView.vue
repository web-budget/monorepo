<script setup lang="ts">
import { storeToRefs } from 'pinia'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import DetailSection from '@/components/common/DetailSection.vue'
import { useCrudDetail } from '@/composables/useCrudDetail'
import { useClassificationsStore } from '@/stores/classifications'
import { typeKey } from '@/utils/typeLabels'

const props = defineProps<{ id: string }>()

const store = useClassificationsStore()
const { classification } = storeToRefs(store)

const { messages, changeToUpdate, remove } = useCrudDetail({
  routeName: 'classifications',
  entity: 'classification',
  id: () => props.id,
  name: () => classification.value?.name,
  findOne: store.findOne,
  remove: store.remove,
})
</script>

<template>
  <DetailCard
    :title="classification?.name ?? $t('classification.form.detailing')"
    :description="classification ? $t(typeKey('classification', classification.type)) : undefined"
    :active="classification?.active"
    :messages="messages"
    @edit="changeToUpdate"
    @delete="remove"
  >
    <template v-if="classification">
      <DetailSection :title="$t('classification.sections.identification')">
        <DetailField :label="$t('classification.form.name')" :value="classification.name" />
        <DetailField
          :label="$t('classification.form.type')"
          :value="$t(typeKey('classification', classification.type))"
        />
        <DetailField
          :label="$t('classification.form.description')"
          :value="classification.description"
          wide
        />
      </DetailSection>
      <DetailSection :title="$t('classification.sections.budget')">
        <DetailField :label="$t('classification.form.budget')">
          <CurrencyDisplay :value="classification.budget" zero-if-null />
        </DetailField>
      </DetailSection>
    </template>
  </DetailCard>
</template>
