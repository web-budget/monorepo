<script setup lang="ts">
import { storeToRefs } from 'pinia'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import { useCrudDetail } from '@/composables/useCrudDetail'
import { useClassificationsStore } from '@/stores/classifications'
import { typeKey } from '@/utils/typeLabels'

const props = defineProps<{ id: string }>()

const store = useClassificationsStore()
const { classification } = storeToRefs(store)

const { messages, changeToList, changeToUpdate, remove } = useCrudDetail({
  routeName: 'classifications',
  deletedNotice: 'notification.classification.deleted',
  id: () => props.id,
  findOne: store.findOne,
  remove: store.remove,
})
</script>

<template>
  <DetailCard
    :title="$t('classification.form.detailing')"
    :active="classification?.active"
    :messages="messages"
    @back="changeToList"
    @edit="changeToUpdate"
    @delete="remove"
  >
    <template v-if="classification">
      <DetailField :label="$t('classification.form.name')" :value="classification.name" />
      <DetailField
        :label="$t('classification.form.type')"
        :value="$t(typeKey('classification', classification.type))"
      />
      <DetailField :label="$t('classification.form.budget')">
        <CurrencyDisplay :value="classification.budget" zero-if-null />
      </DetailField>
      <DetailField
        :label="$t('classification.form.description')"
        :value="classification.description"
      />
    </template>
  </DetailCard>
</template>
