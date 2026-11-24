<script setup lang="ts">
import { ArrowLeftRight, Info, Scale, ScrollText } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import DetailSection from '@/components/common/DetailSection.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import AdjustBalanceDialog from '@/components/wallets/AdjustBalanceDialog.vue'
import { useCrudDetail } from '@/composables/useCrudDetail'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { useStatementStore } from '@/stores/statement'
import { useWalletsStore } from '@/stores/wallets'
import { adjustmentNotice } from '@/utils/statement'
import { typeKey } from '@/utils/typeLabels'

const props = defineProps<{ id: string }>()

const { n } = useI18n()

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

async function adjust(target: { id: string }, form: { value: number }) {
  if (await adjustErrors.run(() => statement.adjust(target.id, form))) {
    adjusting.value = false
    const notice = adjustmentNotice(form.value, wallet.value?.name, n)
    showSuccess('statement.toast.adjusted', notice.detail, true, notice.params)
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
      <Button type="button" variant="outline" :disabled="!wallet.active" @click="adjusting = true">
        <Scale />{{ $t('wallet.actions.adjust-balance') }}
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
