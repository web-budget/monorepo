<script setup lang="ts">
import { storeToRefs } from 'pinia'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import DetailSection from '@/components/common/DetailSection.vue'
import { useCrudDetail } from '@/composables/useCrudDetail'
import { useWalletsStore } from '@/stores/wallets'
import { typeKey } from '@/utils/typeLabels'

const props = defineProps<{ id: string }>()

const store = useWalletsStore()
const { wallet } = storeToRefs(store)

const { messages, changeToUpdate, remove } = useCrudDetail({
  routeName: 'wallets',
  entity: 'wallet',
  id: () => props.id,
  name: () => wallet.value?.name,
  findOne: store.findOne,
  remove: store.remove,
})
</script>

<template>
  <DetailCard
    :title="wallet?.name ?? $t('wallet.form.detailing')"
    :active="wallet?.active"
    :messages="messages"
    @edit="changeToUpdate"
    @delete="remove"
  >
    <template v-if="wallet">
      <DetailSection :title="$t('wallet.sections.identification')">
        <DetailField :label="$t('wallet.form.name')" :value="wallet.name" />
        <DetailField :label="$t('wallet.form.type')" :value="$t(typeKey('wallet', wallet.type))" />
        <DetailField :label="$t('wallet.form.description')" :value="wallet.description" wide />
      </DetailSection>
      <DetailSection
        v-if="wallet.type !== 'PERSONAL'"
        :title="$t('wallet.sections.bank')"
        columns="md:grid-cols-3"
      >
        <DetailField :label="$t('wallet.form.bank')" :value="wallet.bank" />
        <DetailField :label="$t('wallet.form.agency')" :value="wallet.agency" mono />
        <DetailField :label="$t('wallet.form.number')" :value="wallet.number" mono />
      </DetailSection>
      <DetailSection :title="$t('wallet.sections.balance')">
        <DetailField :label="$t('wallet.form.balance')">
          <CurrencyDisplay
            :value="wallet.currentBalance"
            zero-if-null
            class="text-base font-semibold"
          />
        </DetailField>
      </DetailSection>
    </template>
  </DetailCard>
</template>
