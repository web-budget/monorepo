<script setup lang="ts">
import { Scale, ScrollText } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import DetailSection from '@/components/common/DetailSection.vue'
import { Button } from '@/components/ui/button'
import AdjustBalanceDialog from '@/components/wallets/AdjustBalanceDialog.vue'
import { useCrudDetail } from '@/composables/useCrudDetail'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { useStatementStore } from '@/stores/statement'
import { useWalletsStore } from '@/stores/wallets'
import { typeKey } from '@/utils/typeLabels'

const props = defineProps<{ id: string }>()

const store = useWalletsStore()
const { wallet } = storeToRefs(store)

const statement = useStatementStore()
const { showSuccess } = useNotification()
const adjustErrors = useServerErrors()
const adjusting = ref(false)

const { messages, changeToUpdate, remove } = useCrudDetail({
  routeName: 'wallets',
  entity: 'wallet',
  id: () => props.id,
  name: () => wallet.value?.name,
  findOne: store.findOne,
  remove: store.remove,
})

async function adjust(target: { id: string }, form: { value: number; name: string }) {
  if (await adjustErrors.run(() => statement.adjust(target.id, form))) {
    adjusting.value = false
    showSuccess('statement.toast.adjusted', 'statement.toast.adjusted-detail', true, {
      name: wallet.value?.name,
    })
    await adjustErrors.run(() => store.findOne(props.id))
  }
}
</script>

<template>
  <DetailCard
    :title="wallet?.name ?? $t('wallet.form.detailing')"
    :active="wallet?.active"
    feminine-status
    :messages="[...messages, ...adjustErrors.messages.value]"
    @edit="changeToUpdate"
    @delete="remove"
  >
    <template #extra-actions>
      <Button v-if="wallet" as-child variant="outline">
        <RouterLink :to="{ path: '/financial/statement', query: { wallet: wallet.id } }">
          <ScrollText />{{ $t('wallet.actions.view-statement') }}
        </RouterLink>
      </Button>
      <Button
        v-if="wallet"
        type="button"
        variant="outline"
        :disabled="!wallet.active"
        @click="adjusting = true"
      >
        <Scale />{{ $t('wallet.actions.adjust-balance') }}
      </Button>
    </template>
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
  <AdjustBalanceDialog
    :wallet="
      adjusting && wallet
        ? { id: wallet.id, name: wallet.name, balance: wallet.currentBalance }
        : null
    "
    :loading="statement.loading"
    @close="adjusting = false"
    @adjust="adjust"
  />
</template>
