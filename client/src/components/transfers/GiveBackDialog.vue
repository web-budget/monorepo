<script setup lang="ts">
import { Undo2 } from 'lucide-vue-next'
import { ref, watch } from 'vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import TransferStatement from '@/components/transfers/TransferStatement.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useServerErrors } from '@/composables/useServerErrors'
import type { TransferView } from '@/types'

const props = defineProps<{
  transfer: TransferView | null
  loading: boolean
  balanceOf: (walletId: string) => Promise<number>
}>()

const emit = defineEmits<{ close: []; confirm: [transfer: TransferView] }>()

const balanceErrors = useServerErrors()
const balances = ref<{ from: number | null; to: number | null }>({ from: null, to: null })

watch(
  () => props.transfer,
  async (transfer) => {
    balances.value = { from: null, to: null }
    if (transfer) {
      await balanceErrors.run(async () => {
        const [from, to] = await Promise.all([
          props.balanceOf(transfer.toWallet.id),
          props.balanceOf(transfer.fromWallet.id),
        ])
        balances.value = { from, to }
      })
    }
  },
)
</script>

<template>
  <Dialog :open="transfer !== null" @update:open="emit('close')">
    <DialogContent class="sm:max-w-lg">
      <div v-if="transfer" class="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{{ $t('transfer.give-back.title') }}</DialogTitle>
          <DialogDescription class="sr-only">
            {{ transfer.fromWallet.name }} → {{ transfer.toWallet.name }}
          </DialogDescription>
        </DialogHeader>
        <ServerErrorAlert :messages="balanceErrors.messages.value" />
        <TransferStatement
          :title="$t('transfer.give-back.statement')"
          :from="{ name: transfer.toWallet.name, balance: balances.from }"
          :to="{ name: transfer.fromWallet.name, balance: balances.to }"
          :value="transfer.value"
        />
        <DialogFooter>
          <Button type="button" variant="outline" @click="emit('close')">
            {{ $t('form.cancel') }}
          </Button>
          <Button type="button" :disabled="loading" @click="emit('confirm', transfer)">
            <Undo2 />{{ $t('transfer.give-back.confirm') }}
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
</template>
