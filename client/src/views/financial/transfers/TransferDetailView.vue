<script setup lang="ts">
import { ScrollText, Undo2 } from 'lucide-vue-next'
import { computed, watch } from 'vue'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import DetailSection from '@/components/common/DetailSection.vue'
import GiveBackDialog from '@/components/transfers/GiveBackDialog.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useGiveBack } from '@/composables/useGiveBack'
import { useServerErrors } from '@/composables/useServerErrors'
import { useTransfersStore } from '@/stores/transfers'

const props = defineProps<{ id: string }>()

const store = useTransfersStore()
const { messages, run } = useServerErrors()
const giveBack = useGiveBack()

const transfer = computed(() => (store.transfer?.id === props.id ? store.transfer : null))

watch(
  () => props.id,
  (id) => run(() => store.findOne(id)),
  { immediate: true },
)
</script>

<template>
  <DetailCard
    :title="
      transfer
        ? `${transfer.fromWallet.name} → ${transfer.toWallet.name}`
        : $t('transfer.form.detailing')
    "
    :messages="messages"
    readonly
  >
    <template v-if="transfer && (transfer.returnOf || transfer.returnedBy)" #badge>
      <Badge variant="neutral">
        {{ $t(transfer.returnOf ? 'transfer.status.is-return' : 'transfer.status.returned') }}
      </Badge>
    </template>
    <template v-if="transfer" #footer>
      <Button as-child variant="outline">
        <RouterLink
          :to="{ path: '/financial/statement', query: { wallet: transfer.fromWallet.id } }"
        >
          <ScrollText />{{ $t('transfer.actions.view-statement') }}
        </RouterLink>
      </Button>
      <Button
        v-if="transfer.returnable"
        type="button"
        variant="outline"
        @click="giveBack.open(transfer)"
      >
        <Undo2 />{{ $t('transfer.actions.give-back') }}
      </Button>
    </template>
    <template v-if="transfer">
      <DetailSection :title="$t('transfer.sections.identification')">
        <DetailField :label="$t('transfer.detail.created-on')" mono>
          <DateTimeDisplay with-time :value="transfer.createdOn" />
        </DetailField>
        <DetailField :label="$t('transfer.detail.value')" mono>
          <CurrencyDisplay :value="transfer.value" class="text-base font-semibold" />
        </DetailField>
        <DetailField :label="$t('transfer.detail.from')" :value="transfer.fromWallet.name" />
        <DetailField :label="$t('transfer.detail.to')" :value="transfer.toWallet.name" />
        <DetailField :label="$t('transfer.detail.note')" :value="transfer.description" wide />
      </DetailSection>
      <section
        v-if="transfer.returnOf || transfer.returnedBy"
        class="grid gap-3 border-b p-5 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8"
      >
        <h2 class="text-base font-semibold">{{ $t('transfer.sections.return') }}</h2>
        <RouterLink
          :to="{
            name: 'transfers.detail',
            params: { id: (transfer.returnOf ?? transfer.returnedBy)!.id },
          }"
          class="text-primary w-fit text-sm hover:underline"
        >
          {{
            transfer.returnOf ? $t('transfer.detail.return-of') : $t('transfer.detail.returned-by')
          }}
          <DateTimeDisplay :value="(transfer.returnOf ?? transfer.returnedBy)!.createdOn" />
        </RouterLink>
      </section>
    </template>
  </DetailCard>
  <GiveBackDialog
    :transfer="giveBack.target.value"
    :loading="store.loading"
    :balance-of="giveBack.balanceOf"
    :messages="giveBack.messages.value"
    @close="giveBack.close()"
    @confirm="giveBack.confirm"
  />
</template>
