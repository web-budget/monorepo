<script setup lang="ts">
import { useForm } from 'vee-validate'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import InputField from '@/components/forms/InputField.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import MoneyField from '@/components/forms/MoneyField.vue'
import SelectField from '@/components/forms/SelectField.vue'
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
import { createPaymentSchema, toPaymentForm } from '@/schemas/movementSchema'
import type { MovementType, PaymentForm, WalletListView } from '@/types'
import { formatLocalDate } from '@/utils/localDate'

interface PayableMovement {
  id: string
  name: string
  type: MovementType
  value: number
}

const props = defineProps<{
  movement: PayableMovement | null
  wallets: WalletListView[]
  loading: boolean
  balanceOf: (walletId: string) => Promise<number>
}>()

const emit = defineEmits<{ close: []; pay: [movement: PayableMovement, form: PaymentForm] }>()

const { t } = useI18n()
const balanceErrors = useServerErrors()

const form = useForm({
  validationSchema: createPaymentSchema(() => props.movement?.value ?? 0),
  initialValues: { paidOn: formatLocalDate(new Date()), wallet: '', discount: null },
})

const balance = ref<number | null>(null)

const receiving = computed(() => props.movement?.type === 'INCOME')
const walletOptions = computed(() =>
  props.wallets.map((wallet) => ({ value: wallet.id, label: wallet.name })),
)
const discount = computed(() => Number(form.values.discount ?? 0))
const amount = computed(() => Math.max(0, (props.movement?.value ?? 0) - discount.value))
const balanceAfter = computed(() =>
  balance.value === null ? null : balance.value + (receiving.value ? amount.value : -amount.value),
)

watch(
  () => props.movement,
  () =>
    form.resetForm({
      values: { paidOn: formatLocalDate(new Date()), wallet: '', discount: null },
    }),
)

watch(
  () => form.values.wallet,
  async (walletId) => {
    balance.value = null
    if (walletId) {
      await balanceErrors.run(async () => {
        balance.value = await props.balanceOf(walletId)
      })
    }
  },
)

const submit = form.handleSubmit((values) => {
  emit('pay', props.movement as PayableMovement, toPaymentForm(values as never))
})
</script>

<template>
  <Dialog :open="movement !== null" @update:open="emit('close')">
    <DialogContent class="sm:max-w-md">
      <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
        <DialogHeader>
          <DialogTitle>
            {{
              t(receiving ? 'movement.pay.title-receive' : 'movement.pay.title-pay', {
                name: movement?.name,
              })
            }}
          </DialogTitle>
          <DialogDescription class="sr-only">{{ movement?.name }}</DialogDescription>
        </DialogHeader>
        <InputField name="paidOn" type="date" :label="t('movement.pay.paid-on')" required />
        <SelectField
          name="wallet"
          :label="t('movement.pay.wallet')"
          :options="walletOptions"
          required
        />
        <MoneyField name="discount" :label="t('movement.pay.discount')" />
        <ServerErrorAlert :messages="balanceErrors.messages.value" />
        <dl
          class="bg-muted/50 grid gap-1.5 rounded-md border p-3 text-sm"
          data-slot="payment-summary"
        >
          <div v-if="balance !== null" class="flex justify-between gap-3">
            <dt class="text-muted-foreground">{{ t('movement.pay.wallet-balance') }}</dt>
            <dd><CurrencyDisplay :value="balance" /></dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted-foreground">{{ t('movement.pay.movement-value') }}</dt>
            <dd><CurrencyDisplay :value="movement?.value ?? 0" /></dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted-foreground">{{ t('movement.pay.discount-value') }}</dt>
            <dd><CurrencyDisplay :value="discount" /></dd>
          </div>
          <div class="flex justify-between gap-3 border-t pt-1.5 font-semibold">
            <dt>
              {{ t(receiving ? 'movement.pay.amount-received' : 'movement.pay.amount-paid') }}
            </dt>
            <dd><CurrencyDisplay :value="amount" /></dd>
          </div>
          <div v-if="balanceAfter !== null" class="flex justify-between gap-3 font-semibold">
            <dt>{{ t('movement.pay.balance-after') }}</dt>
            <dd><CurrencyDisplay :value="balanceAfter" /></dd>
          </div>
        </dl>
        <DialogFooter>
          <Button type="button" variant="outline" @click="emit('close')">
            {{ t('form.cancel') }}
          </Button>
          <Button type="submit" :disabled="loading">
            {{ t(receiving ? 'movement.pay.confirm-receive' : 'movement.pay.confirm-pay') }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
