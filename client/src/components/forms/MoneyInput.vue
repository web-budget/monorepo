<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { inputClass } from '@/components/ui/input/inputClass'
import { cn } from '@/lib/utils'
import { parseMoneyInput } from '@/utils/money'

const props = withDefaults(
  defineProps<{ modelValue: number | null; label: string; disabled?: boolean }>(),
  { disabled: false },
)

const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>()

const { n } = useI18n()

function format(value: number | null) {
  return value === null ? '' : n(value, 'currency')
}

function read(event: Event) {
  const input = event.target as HTMLInputElement
  const amount = parseMoneyInput(input.value, format(props.modelValue))
  input.value = format(amount)
  emit('update:modelValue', amount)
}
</script>

<template>
  <input
    type="text"
    inputmode="numeric"
    autocomplete="off"
    data-slot="input"
    :aria-label="label"
    :value="format(modelValue)"
    :placeholder="format(0)"
    :disabled="disabled"
    :class="
      cn(
        inputClass,
        'focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]',
        'w-36 text-right font-mono',
      )
    "
    @input="read"
  />
</template>
