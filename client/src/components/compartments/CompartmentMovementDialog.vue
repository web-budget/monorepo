<script setup lang="ts">
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, TriangleAlert } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import InputField from '@/components/forms/InputField.vue'
import MoneyField from '@/components/forms/MoneyField.vue'
import SegmentedField from '@/components/forms/SegmentedField.vue'
import SelectField from '@/components/forms/SelectField.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  compartmentMovementFormSchema,
  toCompartmentMovementForm,
  type CompartmentMovementFormValues,
} from '@/schemas/compartmentMovementSchema'
import type {
  CompartmentMovementDirection,
  CompartmentMovementForm,
  CompartmentView,
} from '@/types'

export interface MovementRequest {
  direction: CompartmentMovementDirection
  compartmentId?: string
  value?: number
}

const props = defineProps<{
  request: MovementRequest | null
  walletName: string
  freeBalance: number
  compartments: CompartmentView[]
  loading: boolean
  messages: string[]
  fieldErrors: Record<string, string>
}>()

const emit = defineEmits<{
  close: []
  move: [compartmentId: string, form: CompartmentMovementForm]
}>()

const { n } = useI18n()

const form = useForm({ validationSchema: compartmentMovementFormSchema })

const values = computed(() => form.values as Partial<CompartmentMovementFormValues>)
const deposit = computed(() => values.value.direction !== 'WITHDRAWAL')
const selected = computed(() =>
  props.compartments.find((compartment) => compartment.id === values.value.compartment),
)
const amount = computed(() => (Number(values.value.value) > 0 ? Number(values.value.value) : null))
const overdrawn = computed(
  () =>
    !deposit.value &&
    selected.value !== undefined &&
    amount.value !== null &&
    amount.value > selected.value.balance,
)
const sign = computed(() => (deposit.value ? 1 : -1))
const freeAfter = computed(() =>
  amount.value !== null && !overdrawn.value ? props.freeBalance - sign.value * amount.value : null,
)
const compartmentAfter = computed(() =>
  amount.value !== null && !overdrawn.value && selected.value
    ? selected.value.balance + sign.value * amount.value
    : null,
)
const turnsNegative = computed(
  () => deposit.value && freeAfter.value !== null && freeAfter.value < 0,
)
const compartmentOptions = computed(() =>
  props.compartments.map((compartment) => ({
    value: compartment.id,
    label: `${compartment.name} · ${n(compartment.balance, 'currency').replace(/^R\$\s*/, '')}`,
  })),
)
const overdrawnMessage = computed(() =>
  selected.value
    ? {
        name: selected.value.name,
        balance: n(selected.value.balance, 'currency').replace(/^R\$\s*/, ''),
      }
    : null,
)

watch(
  () => props.request,
  (request) => {
    if (request) {
      form.resetForm({
        values: {
          direction: request.direction,
          compartment: request.compartmentId ?? '',
          value: request.value,
          note: '',
        },
      })
    }
  },
)

watch(
  () => props.fieldErrors,
  (errors) => form.setErrors(errors),
)

const submit = form.handleSubmit((submitted) => {
  const typed = submitted as CompartmentMovementFormValues
  emit('move', typed.compartment, toCompartmentMovementForm(typed))
})
</script>

<template>
  <Dialog :open="request !== null" @update:open="emit('close')">
    <DialogContent class="sm:max-w-lg">
      <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
        <DialogHeader>
          <DialogTitle>{{ $t('compartment.movement.title') }}</DialogTitle>
          <DialogDescription class="sr-only">{{ walletName }}</DialogDescription>
        </DialogHeader>
        <ServerErrorAlert :messages="messages" />
        <SegmentedField
          name="direction"
          :label="$t('compartment.movement.direction')"
          class="[&>div]:w-full"
          :options="[
            { value: 'DEPOSIT', label: $t('compartment.movement.deposit'), icon: ArrowDownToLine },
            {
              value: 'WITHDRAWAL',
              label: $t('compartment.movement.withdraw'),
              icon: ArrowUpFromLine,
            },
          ]"
        />
        <SelectField
          name="compartment"
          :label="
            deposit
              ? $t('compartment.movement.deposit-into')
              : $t('compartment.movement.withdraw-from')
          "
          :options="compartmentOptions"
          :placeholder="$t('compartment.movement.choose')"
          required
        />
        <div class="grid gap-1.5">
          <MoneyField name="value" :label="$t('compartment.movement.value')" required />
          <p v-if="overdrawn && overdrawnMessage" class="text-destructive text-xs" role="alert">
            {{ $t('compartment.movement.over', overdrawnMessage) }}
          </p>
        </div>
        <dl
          class="bg-muted/50 grid gap-1.5 rounded-md border p-3 text-sm"
          data-slot="movement-summary"
        >
          <div class="flex items-center justify-between gap-3">
            <dt class="text-muted-foreground">{{ $t('compartment.movement.free') }}</dt>
            <dd class="inline-flex items-center gap-1.5">
              <CurrencyDisplay :value="freeBalance" :signed="freeBalance < 0" glued bare />
              <template v-if="freeAfter !== null">
                <ArrowRight class="text-muted-foreground size-3.5" />
                <CurrencyDisplay
                  :value="freeAfter"
                  :signed="freeAfter < 0"
                  glued
                  bare
                  class="font-semibold"
                />
              </template>
            </dd>
          </div>
          <div v-if="selected" class="flex items-center justify-between gap-3">
            <dt class="text-muted-foreground truncate">{{ selected.name }}</dt>
            <dd class="inline-flex items-center gap-1.5">
              <CurrencyDisplay :value="selected.balance" bare />
              <template v-if="compartmentAfter !== null">
                <ArrowRight class="text-muted-foreground size-3.5" />
                <CurrencyDisplay :value="compartmentAfter" bare class="font-semibold" />
              </template>
            </dd>
          </div>
        </dl>
        <Alert v-if="turnsNegative" variant="attention" data-slot="negative-notice">
          <TriangleAlert />
          <AlertTitle>{{ $t('compartment.movement.negative') }}</AlertTitle>
        </Alert>
        <div class="grid gap-1">
          <InputField
            name="note"
            :label="$t('compartment.movement.note')"
            :maxlength="150"
            multiline
          />
          <span class="text-muted-foreground justify-self-end font-mono text-[11px]">
            {{ (values.note ?? '').length }}/150
          </span>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" @mousedown.prevent @click="emit('close')">
            {{ $t('form.cancel') }}
          </Button>
          <Button type="submit" :disabled="loading || overdrawn">
            <ArrowDownToLine v-if="deposit" /><ArrowUpFromLine v-else />
            {{ deposit ? $t('compartment.movement.deposit') : $t('compartment.movement.withdraw') }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
