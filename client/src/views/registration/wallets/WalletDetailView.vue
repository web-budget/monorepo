<script setup lang="ts">
import { ArrowLeftRight, CheckCheck, Info, ScrollText } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import CompartmentFormDialog from '@/components/compartments/CompartmentFormDialog.vue'
import CompartmentMovementDialog from '@/components/compartments/CompartmentMovementDialog.vue'
import CompartmentsCard from '@/components/compartments/CompartmentsCard.vue'
import DeleteCompartmentDialog from '@/components/compartments/DeleteCompartmentDialog.vue'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import DetailSection from '@/components/common/DetailSection.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import ReconcileDialog from '@/components/wallets/ReconcileDialog.vue'
import ReconciliationHistory from '@/components/wallets/ReconciliationHistory.vue'
import { useCompartmentActions } from '@/composables/useCompartmentActions'
import { useCrudDetail } from '@/composables/useCrudDetail'
import { useReconciliation } from '@/composables/useReconciliation'
import { useReconciliationHistory } from '@/composables/useReconciliationHistory'
import { useServerErrors } from '@/composables/useServerErrors'
import { useCompartmentsStore } from '@/stores/compartments'
import { useWalletsStore } from '@/stores/wallets'
import { bareAmount } from '@/utils/reconciliation'
import { typeKey } from '@/utils/typeLabels'

const props = defineProps<{ id: string }>()

const { n } = useI18n()
const router = useRouter()

const store = useWalletsStore()
const { wallet } = storeToRefs(store)

const compartmentsStore = useCompartmentsStore()
const { compartments } = storeToRefs(compartmentsStore)

const reloadErrors = useServerErrors()

const { messages, changeToUpdate, remove } = useCrudDetail({
  routeName: 'wallets',
  entity: 'wallet',
  id: () => props.id,
  name: () => wallet.value?.name,
  findOne: store.findOne,
  remove: store.remove,
})

async function reload() {
  await reloadErrors.run(() =>
    Promise.all([store.findOne(props.id), compartmentsStore.findAll(props.id)]),
  )
}

const actions = useCompartmentActions({
  walletId: () => props.id,
  walletName: () => wallet.value!.name,
  reload,
})

const hasCompartments = computed(() => wallet.value!.compartmentCount > 0)

onMounted(() => reloadErrors.run(() => compartmentsStore.findAll(props.id)))

function openHistory(compartmentId: string) {
  return router.push({
    name: 'wallets.compartments.detail',
    params: { id: props.id, compartmentId },
  })
}

const history = useReconciliationHistory(() => props.id)

const reconciliation = useReconciliation(() =>
  Promise.all([reloadErrors.run(() => store.findOne(props.id)), history.restart()]),
)

const lastReconciliation = computed(() => {
  const last = wallet.value?.lastReconciliation
  if (last == null) {
    return null
  }
  return {
    createdOn: last.createdOn,
    text: `wallet.reconciliation.last-${last.difference > 0 ? 'credit' : 'debit'}`,
    amount: bareAmount(last.difference, n),
  }
})
</script>

<template>
  <DetailCard
    :title="wallet?.name ?? $t('wallet.form.detailing')"
    :active="wallet?.active"
    feminine-status
    :messages="[...messages, ...reloadErrors.messages.value, ...history.messages.value]"
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
      <DetailSection
        :title="$t('wallet.sections.balance')"
        :columns="hasCompartments ? 'md:grid-cols-2' : 'md:grid-cols-3'"
      >
        <DetailField v-if="hasCompartments" :label="$t('wallet.form.total')">
          <CurrencyDisplay
            :value="wallet.totalBalance"
            :signed="wallet.totalBalance < 0"
            glued
            zero-if-null
            class="text-xl font-semibold"
          />
        </DetailField>
        <DetailField
          :label="hasCompartments ? $t('wallet.form.free-balance') : $t('wallet.form.balance')"
        >
          <CurrencyDisplay
            :value="wallet.currentBalance"
            :signed="wallet.currentBalance < 0"
            glued
            zero-if-null
            :class="hasCompartments ? 'text-base font-semibold' : 'text-xl font-semibold'"
          />
        </DetailField>
        <DetailField :label="$t('wallet.form.last-entry')" mono>
          <DateTimeDisplay v-if="wallet.lastEntryOn" with-time :value="wallet.lastEntryOn" />
          <template v-else>---</template>
        </DetailField>
        <DetailField :label="$t('wallet.form.last-reconciliation')">
          <template v-if="lastReconciliation">
            <DateTimeDisplay
              with-time
              class="font-mono tabular-nums"
              :value="lastReconciliation.createdOn"
            />
            <span class="text-muted-foreground mt-0.5 block text-xs">
              {{ $t(lastReconciliation.text, { amount: lastReconciliation.amount }) }}
            </span>
          </template>
          <span v-else class="text-muted-foreground">{{ $t('wallet.reconciliation.none') }}</span>
        </DetailField>
      </DetailSection>
    </template>
    <template v-if="wallet" #after>
      <CompartmentsCard
        :compartments="compartments"
        :wallet-active="wallet.active"
        @deposit="actions.openMovement('DEPOSIT', $event)"
        @withdraw="actions.openMovement('WITHDRAWAL', $event)"
        @create="actions.openCreate()"
        @history="openHistory"
        @edit="actions.openEdit"
        @remove="actions.openRemove"
      />
      <ReconciliationHistory
        v-if="!(history.failed.value && history.total.value === 0)"
        :wallet-id="wallet.id"
        :reconciliations="history.reconciliations.value"
        :total="history.total.value"
        :current-page="history.current.value"
        :page-size="history.size.value"
        :selected-id="history.selectedId.value"
        :loading="history.loading.value"
        :can-reconcile="wallet.active"
        @page-changed="history.change"
        @reconcile="reconciliation.open(wallet, wallet.currentBalance)"
      />
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
  <CompartmentFormDialog
    :open="actions.formOpen.value"
    :compartment="actions.formTarget.value"
    :wallet-name="wallet?.name ?? ''"
    :loading="compartmentsStore.loading"
    :messages="actions.formErrors.generalMessages.value"
    :field-errors="actions.formErrors.fieldMessages.value"
    @close="actions.closeForm()"
    @submit="actions.submitForm"
  />
  <DeleteCompartmentDialog
    :compartment="actions.removeTarget.value"
    :wallet-name="wallet?.name ?? ''"
    :loading="compartmentsStore.loading"
    :messages="actions.removeErrors.messages.value"
    @close="actions.closeRemove()"
    @confirm="actions.confirmRemove()"
    @withdraw-all="actions.withdrawAll()"
  />
  <CompartmentMovementDialog
    :request="actions.movementRequest.value"
    :wallet-name="wallet?.name ?? ''"
    :free-balance="wallet?.currentBalance ?? 0"
    :compartments="compartments"
    :loading="compartmentsStore.loading"
    :messages="actions.movementErrors.generalMessages.value"
    :field-errors="actions.movementErrors.fieldMessages.value"
    @close="actions.closeMovement()"
    @move="actions.move"
  />
</template>
