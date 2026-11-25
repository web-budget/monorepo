<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { computed, watch } from 'vue'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import MoneyField from '@/components/forms/MoneyField.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { adjustmentFormSchema, toAdjustmentForm } from '@/schemas/adjustmentSchema'
import type { AdjustmentForm } from '@/types'

interface AdjustableWallet {
  id: string
  name: string
  balance: number
}

const props = defineProps<{ wallet: AdjustableWallet | null; loading: boolean }>()

const emit = defineEmits<{ close: []; adjust: [wallet: AdjustableWallet, form: AdjustmentForm] }>()

const form = useForm({ validationSchema: adjustmentFormSchema })

const adjustment = computed(() => {
  const value = Number(form.values.value)
  return Number.isFinite(value) ? value : 0
})
const walletBalance = computed(() => props.wallet?.balance ?? 0)
const balanceAfter = computed(() => walletBalance.value + adjustment.value)

watch(
  () => props.wallet,
  () => form.resetForm({ values: {} }),
)

const submit = form.handleSubmit((values) => {
  emit('adjust', props.wallet as AdjustableWallet, toAdjustmentForm(values as never))
})
</script>

<template>
  <Dialog :open="wallet !== null" @update:open="emit('close')">
    <DialogContent class="sm:max-w-lg">
      <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
        <DialogHeader>
          <DialogTitle>{{ $t('statement.adjust.title', { name: wallet?.name }) }}</DialogTitle>
          <DialogDescription class="sr-only">{{ wallet?.name }}</DialogDescription>
        </DialogHeader>
        <MoneyField
          name="value"
          :label="$t('statement.adjust.value')"
          :placeholder="$t('statement.adjust.value-example')"
          signed
          required
        />
        <dl
          class="bg-muted/50 grid gap-1.5 rounded-md border p-3 text-sm"
          data-slot="adjust-summary"
        >
          <div class="flex justify-between gap-3">
            <dt class="text-muted-foreground">{{ $t('statement.adjust.wallet-balance') }}</dt>
            <dd><CurrencyDisplay :value="walletBalance" :signed="walletBalance < 0" glued /></dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted-foreground">{{ $t('statement.adjust.adjustment') }}</dt>
            <dd><CurrencyDisplay :value="adjustment" :signed="adjustment < 0" glued /></dd>
          </div>
          <div class="flex justify-between gap-3 border-t pt-1.5 font-semibold">
            <dt>{{ $t('statement.adjust.balance-after') }}</dt>
            <dd><CurrencyDisplay :value="balanceAfter" :signed="balanceAfter < 0" glued /></dd>
          </div>
        </dl>
        <DialogFooter>
          <Button type="button" variant="outline" @mousedown.prevent @click="emit('close')">
            {{ $t('form.cancel') }}
          </Button>
          <Button type="submit" :disabled="loading">
            <Check />{{ $t('statement.adjust.confirm') }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
