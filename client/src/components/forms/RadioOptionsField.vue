<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { useField } from 'vee-validate'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    name: string
    label: string
    options: { label: string; value: boolean | string }[]
    disabled?: boolean
    class?: string
  }>(),
  { disabled: false, class: undefined },
)

const { value } = useField<boolean | string>(() => props.name)
</script>

<template>
  <div role="radiogroup" :aria-label="label" :class="cn('grid gap-2', props.class)">
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      role="radio"
      :aria-checked="value === option.value"
      :disabled="disabled"
      class="flex items-center gap-2.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-70"
      @click="value = option.value"
    >
      <span
        aria-hidden="true"
        :class="[
          'border-input bg-card grid size-4 shrink-0 place-content-center rounded-full border',
          value === option.value && 'border-primary bg-primary text-primary-foreground',
        ]"
      >
        <Check v-if="value === option.value" class="size-3.5" />
      </span>
      {{ option.label }}
    </button>
  </div>
</template>
