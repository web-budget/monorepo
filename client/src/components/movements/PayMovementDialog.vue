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
import { createPaymentSchema, PAYMENT_METHODS, toPaymentForm } from '@/schemas/movementSchema'
import type { CardListView, MovementType, PaymentForm, WalletListView } from '@/types'
import { formatLocalDate } from '@/utils/localDate'

interface PayableMovement {
  id: string
  name: string
  type: MovementType
  value: number
  invoicePayment?: boolean
  suggestedCard?: string | null
}

const props = defineProps<{
  movement: PayableMovement | null
  wallets: WalletListView[]
  cards: CardListView[]
  loading: boolean
  balanceOf: (walletId: string) => Promise<number>
}>()

const emit = defineEmits<{ close: []; pay: [movement: PayableMovement, form: PaymentForm] }>()

const { t } = useI18n()
const balanceErrors = useServerErrors()

function initialValues() {
  const suggestedCard = props.movement?.suggestedCard
  return {
    paidOn: formatLocalDate(new Date()),
    via: suggestedCard ? ('CARD' as const) : ('WALLET' as const),
    wallet: '',
    card: suggestedCard ?? '',
    discount: null,
  }
}

const form = useForm({
  validationSchema: createPaymentSchema(() => props.movement?.value ?? 0),
  initialValues: initialValues(),
})

const balance = ref<number | null>(null)

const onCard = computed(() => form.values.via === 'CARD')
const cardAllowed = computed(
  () => props.movement?.type === 'EXPENSE' && !props.movement.invoicePayment,
)
const methodOptions = computed(() =>
  PAYMENT_METHODS.map((method) => ({ value: method, label: t(`movement.pay.method.${method}`) })),
)
const cardOptions = computed(() =>
  props.cards.map((card) => ({ value: card.id, label: card.name })),
)
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
      values: initialValues(),
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
          v-if="cardAllowed"
          name="via"
          :label="t('movement.pay.method.label')"
          :options="methodOptions"
        />
        <SelectField
          v-if="onCard"
          name="card"
          :label="t('movement.pay.card')"
          :options="cardOptions"
          required
        />
        <SelectField
          v-else
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
          <div v-if="!onCard && balance !== null" class="flex justify-between gap-3">
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
          <div
            v-if="!onCard && balanceAfter !== null"
            class="flex justify-between gap-3 font-semibold"
          >
            <dt>{{ t('movement.pay.balance-after') }}</dt>
            <dd><CurrencyDisplay :value="balanceAfter" /></dd>
          </div>
          <p v-if="onCard" class="text-muted-foreground text-xs" data-slot="card-note">
            {{ t('movement.pay.card-note') }}
          </p>
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
