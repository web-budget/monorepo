<script setup lang="ts">
import { storeToRefs } from 'pinia'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import { useCrudDetail } from '@/composables/useCrudDetail'
import { useWalletsStore } from '@/stores/wallets'
import { typeKey } from '@/utils/typeLabels'

const props = defineProps<{ id: string }>()

const store = useWalletsStore()
const { wallet } = storeToRefs(store)

const { messages, changeToList, changeToUpdate, remove } = useCrudDetail({
  routeName: 'wallets',
  deletedNotice: 'notification.wallet.deleted',
  id: () => props.id,
  findOne: store.findOne,
  remove: store.remove,
})
</script>

<template>
  <DetailCard
    :title="$t('wallet.form.detailing')"
    :active="wallet?.active"
    :messages="messages"
    @back="changeToList"
    @edit="changeToUpdate"
    @delete="remove"
  >
    <template v-if="wallet">
      <DetailField :label="$t('wallet.form.name')" :value="wallet.name" />
      <DetailField :label="$t('wallet.form.type')" :value="$t(typeKey('wallet', wallet.type))" />
      <DetailField :label="$t('wallet.form.bank')" :value="wallet.bank" />
      <DetailField :label="$t('wallet.form.agency')" :value="wallet.agency" />
      <DetailField :label="$t('wallet.form.number')" :value="wallet.number" />
      <DetailField :label="$t('wallet.form.description')" :value="wallet.description" />
    </template>
  </DetailCard>
</template>
