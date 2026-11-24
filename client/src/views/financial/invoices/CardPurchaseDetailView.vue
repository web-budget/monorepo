<script setup lang="ts">
import { CreditCard, Lock, Pencil, Trash2 } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import DetailSection from '@/components/common/DetailSection.vue'
import PurchaseInstallmentBadge from '@/components/invoices/PurchaseInstallmentBadge.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useCrudDetail } from '@/composables/useCrudDetail'
import { useCardPurchasesStore } from '@/stores/cardPurchases'
import { purchaseDisplayName } from '@/utils/invoices'

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

const editable = computed(
  () => purchase.value?.invoice.status === 'OPEN' && !purchase.value.movement,
)
</script>

<template>
  <DetailCard
    :title="purchase ? purchaseDisplayName(purchase) : $t('card-purchase.form.detailing')"
    :messages="messages"
    readonly
  >
    <template v-if="purchase" #badge>
      <PurchaseInstallmentBadge :recurring-movement="purchase.recurringMovement" />
    </template>
    <template v-if="purchase" #footer>
      <Button as-child type="button" variant="outline">
        <RouterLink :to="{ name: 'invoices.detail', params: { id: purchase.invoice.id } }">
          <CreditCard />{{ $t('card-purchase.actions.view-invoice') }}
        </RouterLink>
      </Button>
      <Button v-if="editable" type="button" variant="outline" @click="changeToUpdate()">
        <Pencil />{{ $t('crud.actions.edit') }}
      </Button>
      <Button
        v-if="editable"
        type="button"
        variant="outline"
        class="text-destructive hover:text-destructive"
        @click="remove()"
      >
        <Trash2 />{{ $t('crud.actions.remove') }}
      </Button>
    </template>
    <template v-if="purchase">
      <div v-if="purchase.movement" class="border-b p-5">
        <Alert data-slot="movement-notice">
          <Lock />
          <AlertTitle>{{ $t('card-purchase.notices.movement') }}</AlertTitle>
          <AlertDescription>
            <RouterLink
              :to="{ name: 'movements.detail', params: { id: purchase.movement } }"
              class="underline underline-offset-2"
            >
              {{ $t('card-purchase.notices.movement-link') }}
            </RouterLink>
          </AlertDescription>
        </Alert>
      </div>
      <DetailSection :title="$t('card-purchase.sections.purchase')" columns="md:grid-cols-3">
        <DetailField :label="$t('card-purchase.detail.name')" :value="purchase.name" />
        <DetailField :label="$t('card-purchase.detail.purchased-on')" mono>
          <DateTimeDisplay fix-time :value="purchase.purchasedOn" />
        </DetailField>
        <DetailField :label="$t('card-purchase.detail.value')">
          <CurrencyDisplay :value="purchase.value" class="text-base font-semibold" />
        </DetailField>
        <DetailField
          :label="$t('card-purchase.detail.cost-center')"
          :value="purchase.costCenter.fullName"
        />
        <DetailField
          :label="$t('card-purchase.detail.classification')"
          :value="purchase.classification.name"
        />
        <DetailField
          :label="$t('card-purchase.detail.invoice')"
          :value="
            $t('card-purchase.detail.invoice-link', {
              card: purchase.card.name,
              period: purchase.financialPeriod.name,
            })
          "
        />
      </DetailSection>
    </template>
  </DetailCard>
</template>
