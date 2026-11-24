<script setup lang="ts">
import { Lock } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import DetailSection from '@/components/common/DetailSection.vue'
import InvoiceStatusBadge from '@/components/invoices/InvoiceStatusBadge.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useCrudDetail } from '@/composables/useCrudDetail'
import { useCardPurchasesStore } from '@/stores/cardPurchases'

const props = defineProps<{ id: string }>()

const store = useCardPurchasesStore()
const { purchase } = storeToRefs(store)

const { messages, changeToUpdate, remove } = useCrudDetail({
  routeName: 'purchases',
  entity: 'card-purchase',
  id: () => props.id,
  name: () => purchase.value?.name,
  findOne: store.findOne,
  remove: store.remove,
})

const readonly = computed(
  () => purchase.value?.invoice.status !== 'OPEN' || purchase.value.movement !== null,
)
</script>

<template>
  <DetailCard
    :title="purchase?.name ?? $t('card-purchase.form.detailing')"
    :messages="messages"
    :readonly="readonly"
    @edit="changeToUpdate"
    @delete="remove"
  >
    <template v-if="purchase" #badge>
      <InvoiceStatusBadge :status="purchase.invoice.status" />
    </template>
    <template v-if="purchase">
      <div v-if="purchase.movement" class="border-b p-5">
        <Alert data-slot="movement-notice">
          <Lock />
          <AlertTitle>{{ $t('card-purchase.notices.movement') }}</AlertTitle>
          <AlertDescription>
            <RouterLink
              :to="`/financial/movements/${purchase.movement}/detail`"
              class="underline underline-offset-2"
            >
              {{ $t('card-purchase.notices.movement-link') }}
            </RouterLink>
          </AlertDescription>
        </Alert>
      </div>
      <DetailSection :title="$t('card-purchase.sections.purchase')" columns="md:grid-cols-3">
        <DetailField :label="$t('card-purchase.detail.value')">
          <CurrencyDisplay :value="purchase.value" />
        </DetailField>
        <DetailField :label="$t('card-purchase.detail.purchased-on')" mono>
          <DateTimeDisplay fix-time :value="purchase.purchasedOn" />
        </DetailField>
        <DetailField :label="$t('card-purchase.detail.card')" :value="purchase.card.name" />
        <DetailField :label="$t('card-purchase.detail.invoice')">
          <RouterLink
            :to="`/financial/invoices/${purchase.invoice.id}/detail`"
            class="underline underline-offset-2"
          >
            {{ $t('card-purchase.detail.invoice-link', { period: purchase.financialPeriod.name }) }}
          </RouterLink>
        </DetailField>
        <DetailField
          :label="$t('card-purchase.detail.period')"
          :value="purchase.financialPeriod.name"
        />
      </DetailSection>
      <DetailSection :title="$t('card-purchase.sections.classification')">
        <DetailField
          :label="$t('card-purchase.detail.cost-center')"
          :value="purchase.costCenter.fullName"
        />
        <DetailField
          :label="$t('card-purchase.detail.classification')"
          :value="purchase.classification.name"
        />
      </DetailSection>
    </template>
  </DetailCard>
</template>
