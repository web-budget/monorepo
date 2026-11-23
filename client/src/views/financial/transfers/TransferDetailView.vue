<script setup lang="ts">
import { ScrollText, Undo2 } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import DetailSection from '@/components/common/DetailSection.vue'
import GiveBackDialog from '@/components/transfers/GiveBackDialog.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useActiveWallets } from '@/composables/useActiveWallets'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { useTransfersStore } from '@/stores/transfers'
import type { TransferView } from '@/types'

const props = defineProps<{ id: string }>()

const router = useRouter()
const store = useTransfersStore()
const { balanceOf } = useActiveWallets()
const { showSuccess } = useNotification()
const { messages, run } = useServerErrors()

const givingBack = ref<TransferView | null>(null)

const transfer = computed(() => (store.transfer?.id === props.id ? store.transfer : null))

watch(() => props.id, (id) => run(() => store.findOne(id)), { immediate: true })

async function giveBack(target: TransferView) {
  let createdId = ''
  if (await run(async () => (createdId = await store.giveBack(target.id)))) {
    givingBack.value = null
    showSuccess('transfer.toast.returned', 'transfer.toast.returned-detail', true, {
      from: target.toWallet.name,
      to: target.fromWallet.name,
    })
    await router.push({ name: 'transfers.detail', params: { id: createdId } })
  }
}
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
    <template #extra-actions>
      <Button v-if="transfer" as-child variant="outline">
        <RouterLink :to="{ path: '/financial/statement', query: { wallet: transfer.fromWallet.id } }">
          <ScrollText />{{ $t('transfer.actions.view-statement') }}
        </RouterLink>
      </Button>
      <Button v-if="transfer?.returnable" type="button" @click="givingBack = transfer">
        <Undo2 />{{ $t('transfer.actions.give-back') }}
      </Button>
    </template>
    <template v-if="transfer && (transfer.returnOf || transfer.returnedBy)" #badge>
      <Badge variant="neutral">
        {{ $t(transfer.returnOf ? 'transfer.status.is-return' : 'transfer.status.returned') }}
      </Badge>
    </template>
    <template v-if="transfer">
      <DetailSection :title="$t('transfer.sections.identification')" columns="md:grid-cols-3">
        <DetailField :label="$t('transfer.detail.created-on')" mono>
          <DateTimeDisplay :value="transfer.createdOn" />
        </DetailField>
        <DetailField :label="$t('transfer.detail.value')">
          <CurrencyDisplay :value="transfer.value" />
        </DetailField>
        <DetailField :label="$t('transfer.detail.from')" :value="transfer.fromWallet.name" />
        <DetailField :label="$t('transfer.detail.to')" :value="transfer.toWallet.name" />
        <DetailField :label="$t('transfer.detail.note')" :value="transfer.description" wide />
      </DetailSection>
      <DetailSection :title="$t('transfer.sections.return')">
        <DetailField v-if="transfer.returnOf" :label="$t('transfer.detail.return-of')">
          <RouterLink
            :to="{ name: 'transfers.detail', params: { id: transfer.returnOf.id } }"
            class="underline underline-offset-2"
          >
            <DateTimeDisplay :value="transfer.returnOf.createdOn" />
          </RouterLink>
        </DetailField>
        <DetailField v-if="transfer.returnedBy" :label="$t('transfer.detail.returned-by')">
          <RouterLink
            :to="{ name: 'transfers.detail', params: { id: transfer.returnedBy.id } }"
            class="underline underline-offset-2"
          >
            <DateTimeDisplay :value="transfer.returnedBy.createdOn" />
          </RouterLink>
        </DetailField>
        <DetailField
          v-if="transfer.returnable"
          :label="$t('transfer.detail.return-state')"
          :value="$t('transfer.detail.not-returned')"
        />
      </DetailSection>
    </template>
  </DetailCard>
  <GiveBackDialog
    :transfer="givingBack"
    :loading="store.loading"
    :balance-of="balanceOf"
    @close="givingBack = null"
    @confirm="giveBack"
  />
</template>
