<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
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

const { t } = useI18n()
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
    <DialogContent class="sm:max-w-md">
      <div v-if="transfer" class="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>
            {{
              t('transfer.give-back.title', {
                from: transfer.fromWallet.name,
                to: transfer.toWallet.name,
              })
            }}
          </DialogTitle>
          <DialogDescription>{{ t('transfer.give-back.description') }}</DialogDescription>
        </DialogHeader>
        <ServerErrorAlert :messages="balanceErrors.messages.value" />
        <div class="bg-muted/50 grid gap-3 rounded-md border p-3">
          <p class="flex justify-between gap-3 text-sm">
            <span class="text-muted-foreground">{{ t('transfer.give-back.value') }}</span>
            <CurrencyDisplay :value="transfer.value" />
          </p>
          <TransferStatement
            :from="{ name: transfer.toWallet.name, balance: balances.from }"
            :to="{ name: transfer.fromWallet.name, balance: balances.to }"
            :value="transfer.value"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" @click="emit('close')">
            {{ t('form.cancel') }}
          </Button>
          <Button type="button" :disabled="loading" @click="emit('confirm', transfer)">
            {{ t('transfer.give-back.confirm') }}
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
</template>
