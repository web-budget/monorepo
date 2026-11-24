<script setup lang="ts">
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
    class?: string
  }>(),
  { disabled: false, required: false, hint: undefined, placeholder: undefined, class: undefined },
)

const CURRENCY_SYMBOL = /^R\$\s*/

const { n } = useI18n()

function format(value: number | null | undefined) {
  return value === null || value === undefined
    ? ''
    : n(value, 'currency').replace(CURRENCY_SYMBOL, '')
}

function readInput(
  event: Event,
  value: number | null | undefined,
  handleChange: (value: number | null, shouldValidate: boolean) => void,
  shouldValidate: boolean,
) {
  const input = event.target as HTMLInputElement
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
            :value="format(value)"
            :placeholder="placeholder"
            :disabled="disabled"
            class="h-full min-w-0 flex-1 bg-transparent px-3 placeholder:text-muted-foreground text-right font-mono tabular-nums outline-none disabled:cursor-not-allowed"
            @input="readInput($event, value, handleChange, errors.length > 0)"
            @blur="handleBlur"
          />
        </FormControl>
      </div>
      <FormDescription v-if="hint">{{ hint }}</FormDescription>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
