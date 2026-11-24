<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { parseMoneyInput } from '@/utils/money'

const props = withDefaults(
  defineProps<{ modelValue: number | null; label: string; disabled?: boolean }>(),
  { disabled: false },
)

const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>()

const CURRENCY_SYMBOL = /^R\$\s*/

const { n } = useI18n()

function format(value: number | null) {
  return value === null ? '' : n(value, 'currency').replace(CURRENCY_SYMBOL, '')
}

function read(event: Event) {
  const input = event.target as HTMLInputElement
  const amount = parseMoneyInput(input.value, format(props.modelValue))
  input.value = format(amount)
  emit('update:modelValue', amount)
}
</script>

<template>
  <div
    data-slot="input-group"
    :class="[
      'border-input bg-card ml-auto flex h-8 w-36 items-center overflow-hidden rounded-md border text-sm shadow-xs transition-[color,box-shadow]',
      'focus-within:border-ring focus-within:ring-ring/40 focus-within:ring-[3px]',
      disabled && 'cursor-not-allowed opacity-50',
    ]"
  >
    <span
      aria-hidden="true"
      class="border-input bg-muted text-muted-foreground flex h-full items-center border-r px-2.5 font-mono text-xs"
      >R$</span
    >
    <input
      type="text"
      inputmode="numeric"
      autocomplete="off"
      data-slot="input"
      :aria-label="label"
      :value="format(modelValue)"
      :placeholder="format(0)"
      :disabled="disabled"
      class="h-full min-w-0 flex-1 bg-transparent px-3 text-right font-mono tabular-nums outline-none disabled:cursor-not-allowed"
      @input="read"
      @click.stop
    />
  </div>
</template>
