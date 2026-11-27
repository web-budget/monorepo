<script setup lang="ts">
import { CheckCheck, CircleAlert, CircleCheck } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import MoneyField from '@/components/forms/MoneyField.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import type { ReconcilableWallet } from '@/composables/useReconciliation'
import {
  RECONCILIATION_REASON_MAXIMUM,
  createReconciliationFormSchema,
  reconciliationDifference,
  toReconciliationForm,
  type ReconciliationFormValues,
} from '@/schemas/reconciliationSchema'
import type { ReconciliationForm } from '@/types'
import { signedAmount, type BalanceChange } from '@/utils/reconciliation'

const props = defineProps<{
  wallet: ReconcilableWallet | null
  loading: boolean
  messages: string[]
  balanceChange: BalanceChange | null
}>()

const emit = defineEmits<{
  close: []
  reconcile: [wallet: ReconcilableWallet, form: ReconciliationForm]
}>()

const { n } = useI18n()

const walletBalance = computed(() => props.wallet?.balance ?? 0)

const form = useForm({
  validationSchema: createReconciliationFormSchema(() => walletBalance.value),
})

const informedBalance = computed(() => {
  const value: unknown = form.values.informedBalance
  return typeof value === 'number' && Number.isFinite(value) ? value : null
})
const difference = computed(() =>
  informedBalance.value === null
    ? null
    : reconciliationDifference(informedBalance.value, walletBalance.value),
)
const hasDifference = computed(() => difference.value !== null && difference.value !== 0)
const matches = computed(() => difference.value === 0)

watch(
  () => props.wallet?.id,
  () => form.resetForm({ values: {} }),
)

const submit = form.handleSubmit((values) => {
  if (!hasDifference.value) {
    return
  }
  emit(
    'reconcile',
    props.wallet as ReconcilableWallet,
    toReconciliationForm(values as unknown as ReconciliationFormValues, walletBalance.value),
  )
})
</script>

<template>
  <Dialog :open="wallet !== null" @update:open="emit('close')">
    <DialogContent class="sm:max-w-lg">
      <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
        <DialogHeader>
          <DialogTitle>{{ $t('wallet.reconcile.title', { name: wallet?.name }) }}</DialogTitle>
          <DialogDescription class="sr-only">{{ wallet?.name }}</DialogDescription>
        </DialogHeader>
        <ServerErrorAlert :messages="messages" />
        <Alert v-if="balanceChange" variant="destructive" data-slot="balance-changed">
          <CircleAlert />
          <AlertTitle>{{ $t('wallet.reconcile.balance-changed') }}</AlertTitle>
          <AlertDescription class="text-foreground">
            {{
              $t('wallet.reconcile.balance-changed-detail', {
                balance: signedAmount(balanceChange.balance, n),
                difference: signedAmount(balanceChange.difference, n),
              })
            }}
          </AlertDescription>
        </Alert>
        <MoneyField
          name="informedBalance"
          :label="
            wallet?.personal
              ? $t('wallet.reconcile.counted-balance')
              : $t('wallet.reconcile.bank-balance')
          "
          :placeholder="$t('wallet.reconcile.balance-example')"
          signed
          required
        />
        <dl
          class="bg-muted/50 grid gap-1.5 rounded-md border p-3 text-sm"
          data-slot="reconcile-summary"
        >
          <div class="flex justify-between gap-3">
            <dt class="text-muted-foreground">{{ $t('wallet.reconcile.wallet-balance') }}</dt>
            <dd>
              <CurrencyDisplay :value="walletBalance" :signed="walletBalance < 0" bare glued />
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted-foreground">{{ $t('wallet.reconcile.informed-balance') }}</dt>
            <dd>
              <CurrencyDisplay
                v-if="informedBalance !== null"
                :value="informedBalance"
                :signed="informedBalance < 0"
                bare
                glued
              />
              <span v-else class="text-muted-foreground font-mono">—</span>
            </dd>
          </div>
          <div class="flex justify-between gap-3 border-t pt-1.5 font-semibold">
            <dt>{{ $t('wallet.reconcile.difference') }}</dt>
            <dd>
              <CurrencyDisplay
                v-if="difference !== null"
                :value="difference"
                :signed="difference < 0"
                :tone="difference > 0 ? 'income' : undefined"
                bare
                glued
              />
              <span v-else class="text-muted-foreground font-mono">—</span>
            </dd>
          </div>
        </dl>
        <Alert v-if="matches" data-slot="balance-matches">
          <CircleCheck />
          <AlertTitle>{{ $t('wallet.reconcile.balance-matches') }}</AlertTitle>
        </Alert>
        <FormField
          v-if="hasDifference"
          v-slot="{ value, errors, handleChange, handleBlur }"
          name="reason"
          :validate-on-model-update="false"
        >
          <FormItem>
            <div class="flex items-center justify-between gap-2">
              <FormLabel required>{{ $t('wallet.reconcile.reason') }}</FormLabel>
              <span class="text-muted-foreground font-mono text-xs" data-slot="reason-counter">
                {{ (value ?? '').length }}/{{ RECONCILIATION_REASON_MAXIMUM }}
              </span>
            </div>
            <FormControl>
              <Textarea
                name="reason"
                :model-value="value"
                rows="2"
                :maxlength="RECONCILIATION_REASON_MAXIMUM"
                :placeholder="$t('wallet.reconcile.reason-example')"
                @update:model-value="handleChange($event, errors.length > 0)"
                @blur="handleBlur"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <DialogFooter>
          <Button type="button" variant="outline" @mousedown.prevent @click="emit('close')">
            {{ $t('form.cancel') }}
          </Button>
          <Button type="submit" :disabled="loading || matches">
            <CheckCheck />{{ $t('wallet.reconcile.confirm') }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
