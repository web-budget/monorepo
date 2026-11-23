<script setup lang="ts">
import { useForm } from 'vee-validate'
import { computed, watch } from 'vue'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import InputField from '@/components/forms/InputField.vue'
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
const balanceAfter = computed(() => (props.wallet?.balance ?? 0) + adjustment.value)

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
    <DialogContent class="sm:max-w-md">
      <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
        <DialogHeader>
          <DialogTitle>{{ $t('statement.adjust.title', { name: wallet?.name }) }}</DialogTitle>
          <DialogDescription>{{ $t('statement.adjust.description') }}</DialogDescription>
        </DialogHeader>
        <InputField
          name="value"
          type="number"
          :label="$t('statement.adjust.value')"
          :hint="$t('statement.adjust.value-hint')"
          mono
          required
        />
        <InputField name="name" :label="$t('statement.adjust.reason')" :maxlength="150" required />
        <dl
          class="bg-muted/50 grid gap-1.5 rounded-md border p-3 text-sm"
          data-slot="adjust-summary"
        >
          <div class="flex justify-between gap-3">
            <dt class="text-muted-foreground">{{ $t('statement.adjust.wallet-balance') }}</dt>
            <dd><CurrencyDisplay :value="wallet?.balance ?? 0" /></dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted-foreground">{{ $t('statement.adjust.adjustment') }}</dt>
            <dd><CurrencyDisplay :value="adjustment" signed /></dd>
          </div>
          <div class="flex justify-between gap-3 border-t pt-1.5 font-semibold">
            <dt>{{ $t('statement.adjust.balance-after') }}</dt>
            <dd><CurrencyDisplay :value="balanceAfter" /></dd>
          </div>
        </dl>
        <DialogFooter>
          <Button type="button" variant="outline" @click="emit('close')">
            {{ $t('form.cancel') }}
          </Button>
          <Button type="submit" :disabled="loading">{{ $t('statement.adjust.confirm') }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
