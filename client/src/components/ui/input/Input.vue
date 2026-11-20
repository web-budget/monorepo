<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { useVModel } from '@vueuse/core'
import { inputClass } from '@/components/ui/input/inputClass'
import { cn } from '@/lib/utils'

const props = defineProps<{
  defaultValue?: string | number
  modelValue?: string | number
  class?: HTMLAttributes['class']
}>()

const emits = defineEmits<{
  (e: 'update:modelValue', payload: string | number): void
}>()

const modelValue = useVModel(props, 'modelValue', emits, {
  passive: true,
  defaultValue: props.defaultValue,
})
</script>

<template>
  <input
    v-model="modelValue"
    data-slot="input"
    :class="
      cn(
        inputClass,
        'focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        props.class,
      )
    "
  />
</template>
