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
import { inputClass } from '@/components/ui/input/inputClass'
import { cn } from '@/lib/utils'
import { parseMoneyInput } from '@/utils/money'

withDefaults(
  defineProps<{
    name: string
    label: string
    disabled?: boolean
    required?: boolean
    hint?: string
    class?: string
  }>(),
  { disabled: false, required: false, hint: undefined, class: undefined },
)

const { n } = useI18n()

function format(value: number | null | undefined) {
  return value === null || value === undefined ? '' : n(value, 'currency')
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
      <FormControl>
        <input
          :name="name"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          data-slot="input"
          :value="format(value)"
          :placeholder="format(0)"
          :disabled="disabled"
          :class="
            cn(
              inputClass,
              'focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]',
              'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
              'font-mono',
            )
          "
          @input="readInput($event, value, handleChange, errors.length > 0)"
          @blur="handleBlur"
        />
      </FormControl>
      <FormDescription v-if="hint">{{ hint }}</FormDescription>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
