<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { cn } from '@/lib/utils'
import { parseMoneyInput } from '@/utils/money'

withDefaults(
  defineProps<{
    name: string
    label: string
    disabled?: boolean
    required?: boolean
    hint?: string
    placeholder?: string
    signed?: boolean
    class?: string
  }>(),
  {
    disabled: false,
    required: false,
    hint: undefined,
    placeholder: undefined,
    signed: false,
    class: undefined,
  },
)

const CURRENCY_SYMBOL = /^R\$\s*/
const SIGNS = /[+\-−]/g

const { n } = useI18n()

function format(value: number | null | undefined) {
  return value === null || value === undefined
    ? ''
    : n(value, 'currency').replace(CURRENCY_SYMBOL, '')
}

const pendingMinus = ref(false)

function show(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return pendingMinus.value ? '−' : ''
  }
  return `${value < 0 ? '−' : '+'}${format(Math.abs(value))}`
}

function readSigned(input: HTMLInputElement, value: number | null | undefined) {
  const signs = input.value.match(SIGNS) ?? []
  const sign = signs[signs.length - 1]
  const negative = sign === '-' || sign === '−'
  const magnitude = parseMoneyInput(
    input.value.replace(SIGNS, ''),
    value === null || value === undefined ? '' : format(Math.abs(value)),
  )
  const amount = magnitude === null ? null : negative ? -magnitude : magnitude
  pendingMinus.value = amount === null && negative
  input.value = show(amount)
  return amount
}

function readInput(
  event: Event,
  value: number | null | undefined,
  handleChange: (value: number | null, shouldValidate: boolean) => void,
  shouldValidate: boolean,
  signed: boolean,
) {
  const input = event.target as HTMLInputElement
  if (signed) {
    handleChange(readSigned(input, value), shouldValidate)
    return
  }
  const amount = parseMoneyInput(input.value, format(value))
  input.value = format(amount)
  handleChange(amount, shouldValidate)
}
</script>

<template>
  <FormField
    v-slot="{ value, errors, handleChange, handleBlur }"
    :name="name"
    :validate-on-model-update="false"
  >
    <FormItem :class="$props.class">
      <FormLabel :required="required">{{ label }}</FormLabel>
      <div
        data-slot="input-group"
        :class="
          cn(
            'border-input bg-card flex h-9 w-full min-w-0 items-center overflow-hidden rounded-md border text-sm shadow-xs transition-[color,box-shadow]',
            'focus-within:border-ring focus-within:ring-ring/40 focus-within:ring-[3px]',
            'has-[input[aria-invalid=true]]:border-destructive',
            disabled && 'cursor-not-allowed opacity-50',
          )
        "
      >
        <span
          aria-hidden="true"
          class="border-input bg-muted text-muted-foreground flex h-full items-center border-r px-2.5 font-mono text-xs"
          >R$</span
        >
        <FormControl>
          <input
            :name="name"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            data-slot="input"
            :value="signed ? show(value) : format(value)"
            :placeholder="placeholder"
            :disabled="disabled"
            class="h-full min-w-0 flex-1 bg-transparent px-3 placeholder:text-muted-foreground text-right font-mono tabular-nums outline-none disabled:cursor-not-allowed"
            @input="readInput($event, value, handleChange, errors.length > 0, signed)"
            @blur="handleBlur"
          />
        </FormControl>
      </div>
      <FormDescription v-if="hint">{{ hint }}</FormDescription>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
