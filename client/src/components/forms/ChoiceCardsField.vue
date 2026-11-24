<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { useField } from 'vee-validate'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    name: string
    label: string
    options: { label: string; value: string; description: string }[]
    disabled?: boolean
    class?: string
  }>(),
  { disabled: false, class: undefined },
)

const { value } = useField<string>(() => props.name)
</script>

<template>
  <div role="radiogroup" :aria-label="label" :class="cn('grid gap-3 md:grid-cols-2', props.class)">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      :aria-checked="value === option.value"
      :disabled="disabled"
      class="border-border bg-card hover:bg-accent/40 aria-checked:border-ring aria-checked:bg-accent aria-checked:ring-ring/30 grid content-start gap-1 rounded-lg border p-3 text-left transition-colors aria-checked:ring-[3px] disabled:cursor-not-allowed disabled:opacity-70"
      @click="value = option.value"
    >
      <span class="flex items-center justify-between gap-2 font-medium">
        {{ option.label }}
        <span
          aria-hidden="true"
          :class="[
            'border-input bg-card grid size-4 shrink-0 place-content-center rounded-sm border',
            value === option.value && 'border-primary bg-primary text-primary-foreground',
          ]"
        >
          <Check v-if="value === option.value" class="size-3.5" />
        </span>
      </span>
      <span class="text-muted-foreground text-xs">{{ option.description }}</span>
    </button>
  </div>
</template>
