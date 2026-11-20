<script setup lang="ts">
import { storeToRefs } from 'pinia'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import DetailSection from '@/components/common/DetailSection.vue'
import { useCrudDetail } from '@/composables/useCrudDetail'
import { useCardsStore } from '@/stores/cards'
import { typeKey } from '@/utils/typeLabels'

const props = defineProps<{ id: string }>()

const store = useCardsStore()
const { card } = storeToRefs(store)

const { messages, changeToUpdate, remove } = useCrudDetail({
  routeName: 'cards',
  entity: 'card',
  id: () => props.id,
  name: () => card.value?.name,
  findOne: store.findOne,
  remove: store.remove,
})
</script>

<template>
  <DetailCard
    :title="card?.name ?? $t('card.form.detailing')"
    :active="card?.active"
    :messages="messages"
    @edit="changeToUpdate"
    @delete="remove"
  >
    <template v-if="card">
      <DetailSection :title="$t('card.sections.identification')">
        <DetailField :label="$t('card.form.name')" :value="card.name" />
        <DetailField :label="$t('card.form.type')" :value="$t(typeKey('card', card.type))" />
        <DetailField :label="$t('card.form.last-four-digits')" :value="card.lastFourDigits" mono />
        <DetailField :label="$t('card.form.flag')" :value="card.flag" />
      </DetailSection>
      <DetailSection v-if="card.type === 'DEBIT'" :title="$t('card.sections.wallet')">
        <DetailField :label="$t('card.form.wallet')" :value="card.wallet?.name" />
      </DetailSection>
      <DetailSection v-else :title="$t('card.sections.invoice')">
        <DetailField
          :label="$t('card.form.invoice-payment-day')"
          :value="card.invoicePaymentDay"
          mono
        />
      </DetailSection>
    </template>
  </DetailCard>
</template>
