<script setup lang="ts">
import { ArrowLeftRight, CheckCheck, Info, ScrollText } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import DetailSection from '@/components/common/DetailSection.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import ReconcileDialog from '@/components/wallets/ReconcileDialog.vue'
import { useCrudDetail } from '@/composables/useCrudDetail'
import { useReconciliation } from '@/composables/useReconciliation'
import { useServerErrors } from '@/composables/useServerErrors'
import { useWalletsStore } from '@/stores/wallets'
import { typeKey } from '@/utils/typeLabels'

const props = defineProps<{ id: string }>()

const store = useWalletsStore()
const { wallet } = storeToRefs(store)

const reloadErrors = useServerErrors()

const { messages, changeToUpdate, remove } = useCrudDetail({
  routeName: 'wallets',
  entity: 'wallet',
  id: () => props.id,
  name: () => wallet.value?.name,
  findOne: store.findOne,
  remove: store.remove,
})

const reconciliation = useReconciliation(() => reloadErrors.run(() => store.findOne(props.id)))
</script>

<template>
  <DetailCard
    :title="wallet?.name ?? $t('wallet.form.detailing')"
    :active="wallet?.active"
    feminine-status
    :messages="[...messages, ...reloadErrors.messages.value]"
    @edit="changeToUpdate"
    @delete="remove"
  >
    <template v-if="wallet" #notice>
      <Alert data-slot="balance-notice">
        <Info />
        <AlertTitle>{{ $t('wallet.notices.balance') }}</AlertTitle>
        <AlertDescription>{{ $t('wallet.notices.balance-description') }}</AlertDescription>
      </Alert>
    </template>
    <template v-if="wallet" #footer>
      <Button as-child variant="outline">
        <RouterLink :to="{ path: '/financial/statement', query: { wallet: wallet.id } }">
          <ScrollText />{{ $t('wallet.actions.view-statement') }}
        </RouterLink>
      </Button>
      <Button as-child variant="outline">
        <RouterLink :to="{ path: '/financial/transfers/create', query: { from: wallet.id } }">
          <ArrowLeftRight />{{ $t('wallet.actions.transfer') }}
        </RouterLink>
      </Button>
      <Button
        type="button"
        variant="outline"
        :disabled="!wallet.active"
        @click="reconciliation.open(wallet, wallet.currentBalance)"
      >
        <CheckCheck />{{ $t('wallet.actions.reconcile') }}
      </Button>
    </template>
    <template v-if="wallet">
      <DetailSection :title="$t('wallet.sections.identification')">
        <DetailField :label="$t('wallet.form.name')" :value="wallet.name" />
        <DetailField :label="$t('wallet.form.type')" :value="$t(typeKey('wallet', wallet.type))" />
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
            :signed="wallet.currentBalance < 0"
            glued
            zero-if-null
            class="text-xl font-semibold"
          />
        </DetailField>
        <DetailField :label="$t('wallet.form.last-entry')" mono>
          <DateTimeDisplay v-if="wallet.lastEntryOn" with-time :value="wallet.lastEntryOn" />
          <template v-else>---</template>
        </DetailField>
      </DetailSection>
    </template>
  </DetailCard>
  <ReconcileDialog
    :wallet="reconciliation.target.value"
    :loading="reconciliation.loading.value"
    :messages="reconciliation.messages.value"
    :balance-change="reconciliation.balanceChange.value"
    @close="reconciliation.close()"
    @reconcile="reconciliation.reconcile"
  />
</template>
