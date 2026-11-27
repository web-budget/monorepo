<script setup lang="ts">
import { Box, CheckCheck } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import DetailSection from '@/components/common/DetailSection.vue'
import OperationBadge from '@/components/statement/OperationBadge.vue'
import { Button } from '@/components/ui/button'
import { useServerErrors } from '@/composables/useServerErrors'
import { useStatementStore } from '@/stores/statement'
import type { WalletEntryView } from '@/types'
import { entryLabel } from '@/utils/statement'

const props = defineProps<{ wallet: string; id: string }>()

const { t } = useI18n()
const store = useStatementStore()
const { messages, run } = useServerErrors()

const loaded = ref<WalletEntryView | null>(null)
const entry = computed(() => (loaded.value?.id === props.id ? loaded.value : null))

watch(
  () => props.id,
  async (id) => {
    await run(async () => {
      loaded.value = await store.findEntry(props.wallet, id)
    })
  },
  { immediate: true },
)
</script>

<template>
  <DetailCard
    :title="entry ? entryLabel(entry, t) : $t('statement.detailing')"
    :messages="messages"
    readonly
  >
    <template v-if="entry" #badge>
      <OperationBadge :origin="entry.origin" />
    </template>
    <template v-if="entry?.compartment" #footer>
      <Button as-child variant="outline">
        <RouterLink
          :to="{
            name: 'wallets.compartments.detail',
            params: { id: wallet, compartmentId: entry.compartment.id },
          }"
        >
          <Box />{{ $t('statement.actions.open-compartment') }}
        </RouterLink>
      </Button>
    </template>
    <template v-else-if="entry?.reconciliation" #footer>
      <Button as-child variant="outline">
        <RouterLink
          :to="{
            name: 'wallets.detail',
            params: { id: wallet },
            query: { reconciliation: entry.reconciliation.id },
          }"
        >
          <CheckCheck />{{ $t('statement.detail.open-reconciliation') }}
        </RouterLink>
      </Button>
    </template>
    <DetailSection v-if="entry" :title="$t('statement.sections.entry')" columns="md:grid-cols-3">
      <DetailField :label="$t('statement.table-columns.created-on')" mono>
        <DateTimeDisplay with-time :value="entry.createdOn" />
      </DetailField>
      <DetailField :label="$t('statement.filters.wallet')" :value="entry.wallet?.name" />
      <DetailField :label="$t('statement.detail.value')">
        <CurrencyDisplay
          :value="entry.value"
          :tone="entry.direction === 'CREDIT' ? 'income' : 'expense'"
          bare
          class="text-base font-semibold"
        />
      </DetailField>
      <DetailField :label="$t('statement.table-columns.origin')">
        {{ $t(`statement.origin.${entry.origin}`) }}
      </DetailField>
      <DetailField :label="$t('statement.table-columns.previous-balance')" mono>
        <CurrencyDisplay
          :value="entry.previousBalance"
          :signed="entry.previousBalance < 0"
          bare
          glued
        />
      </DetailField>
      <DetailField :label="$t('statement.table-columns.resulting-balance')" mono>
        <CurrencyDisplay
          :value="entry.resultingBalance"
          :signed="entry.resultingBalance < 0"
          bare
          glued
        />
      </DetailField>
    </DetailSection>
    <DetailSection
      v-if="entry?.compartment"
      :title="$t('statement.sections.compartment')"
      columns="md:grid-cols-3"
    >
      <DetailField :label="$t('statement.detail.compartment')">
        <RouterLink
          :to="{
            name: 'wallets.compartments.detail',
            params: { id: wallet, compartmentId: entry.compartment.id },
          }"
          class="text-primary underline-offset-4 hover:underline"
          >{{ entry.compartment.name }}</RouterLink
        >
      </DetailField>
      <DetailField
        :label="$t('statement.detail.movement')"
        :value="
          $t(
            `statement.detail.movement-${entry.compartment.direction === 'DEPOSIT' ? 'deposit' : 'withdrawal'}`,
          )
        "
      />
      <DetailField :label="$t('statement.detail.note')" :value="entry.compartment.note" />
    </DetailSection>
    <DetailSection
      v-if="entry?.reconciliation"
      :title="$t('statement.sections.reconciliation')"
      columns="md:grid-cols-3"
    >
      <DetailField :label="$t('statement.detail.reconciled-on')" mono>
        <DateTimeDisplay with-time :value="entry.reconciliation.createdOn" />
      </DetailField>
      <DetailField :label="$t('wallet.reconcile.informed-balance')" mono>
        <CurrencyDisplay
          :value="entry.reconciliation.informedBalance"
          :signed="entry.reconciliation.informedBalance < 0"
          bare
          glued
        />
      </DetailField>
      <DetailField :label="$t('wallet.reconcile.wallet-balance')" mono>
        <CurrencyDisplay
          :value="entry.reconciliation.walletBalance"
          :signed="entry.reconciliation.walletBalance < 0"
          bare
          glued
        />
      </DetailField>
      <DetailField :label="$t('wallet.reconcile.difference')">
        <CurrencyDisplay
          :value="entry.reconciliation.difference"
          :tone="entry.reconciliation.difference > 0 ? 'income' : undefined"
          :signed="entry.reconciliation.difference < 0"
          bare
          glued
        />
      </DetailField>
      <DetailField
        :label="$t('wallet.reconcile.reason')"
        :value="entry.reconciliation.reason"
        wide
      />
    </DetailSection>
  </DetailCard>
</template>
