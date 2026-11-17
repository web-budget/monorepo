<script setup lang="ts">
import { storeToRefs } from 'pinia'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import { useCrudDetail } from '@/composables/useCrudDetail'
import { useCardsStore } from '@/stores/cards'
import { typeKey } from '@/utils/typeLabels'

const props = defineProps<{ id: string }>()

const store = useCardsStore()
const { card } = storeToRefs(store)

const { messages, changeToList, changeToUpdate, remove } = useCrudDetail({
  routeName: 'cards',
  deletedNotice: 'notification.card.deleted',
  id: () => props.id,
  findOne: store.findOne,
  remove: store.remove,
})
</script>

<template>
  <DetailCard
    :title="$t('card.form.detailing')"
    :active="card?.active"
    :messages="messages"
    @back="changeToList"
    @edit="changeToUpdate"
    @delete="remove"
  >
    <template v-if="card">
      <DetailField :label="$t('card.form.name')" :value="card.name" />
      <DetailField :label="$t('card.form.type')" :value="$t(typeKey('card', card.type))" />
      <DetailField :label="$t('card.form.wallet')" :value="card.wallet?.name" />
      <DetailField :label="$t('card.form.invoice-payment-day')" :value="card.invoicePaymentDay" />
      <DetailField :label="$t('card.form.last-four-digits')" :value="card.lastFourDigits" />
      <DetailField :label="$t('card.form.flag')" :value="card.flag" />
    </template>
  </DetailCard>
</template>
