<script setup lang="ts">
import { CreditCard, Pencil } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import DetailSection from '@/components/common/DetailSection.vue'
import { Button } from '@/components/ui/button'
import { useServerErrors } from '@/composables/useServerErrors'
import { useCardsStore } from '@/stores/cards'
import { walletLabel } from '@/utils/walletLabel'

const props = defineProps<{ id: string }>()

const router = useRouter()
const store = useCardsStore()
const { card } = storeToRefs(store)
const { messages, run } = useServerErrors()

onMounted(() => run(() => store.findOne(props.id)))

function changeToUpdate() {
  return router.push({ name: 'cards.update', params: { id: props.id } })
}

function viewInvoices() {
  return router.push({ name: 'invoices', query: { card: props.id } })
}
</script>

<template>
  <DetailCard
    :title="card?.name ?? $t('card.form.detailing')"
    :active="card?.active"
    :messages="messages"
    readonly
  >
    <template v-if="card" #footer>
      <Button type="button" variant="outline" @click="viewInvoices()">
        <CreditCard />{{ $t('card.actions.view-invoices') }}
      </Button>
      <Button type="button" variant="outline" @click="changeToUpdate()">
        <Pencil />{{ $t('crud.actions.edit') }}
      </Button>
    </template>
    <template v-if="card">
      <DetailSection :title="$t('card.sections.identification')" columns="md:grid-cols-3">
        <DetailField :label="$t('card.form.name')" :value="card.name" />
        <DetailField :label="$t('card.form.flag')" :value="card.flag" />
        <DetailField :label="$t('card.detail.last-digits')" mono>
          ••{{ card.lastFourDigits }}
        </DetailField>
      </DetailSection>
      <DetailSection :title="$t('card.sections.invoice')">
        <DetailField
          :label="$t('card.detail.invoice-payment-day')"
          :value="card.invoicePaymentDay"
          mono
        />
        <DetailField :label="$t('card.detail.wallet')" :value="card.wallet ? walletLabel(card.wallet) : undefined" />
      </DetailSection>
    </template>
  </DetailCard>
</template>
