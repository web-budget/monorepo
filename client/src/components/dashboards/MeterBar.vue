<script setup lang="ts">
import { computed } from 'vue'
import type { GoalSignal } from '@/utils/goalSignal'

const props = withDefaults(defineProps<{ width: number; signal?: GoalSignal; label: string }>(), {
  signal: 'ok',
})

const TRACKS: Record<GoalSignal, string> = {
  ok: 'bg-[color-mix(in_oklch,var(--primary)_14%,var(--card))]',
  warn: 'bg-highlight/35',
  over: 'bg-expense-muted',
}

const FILLS: Record<GoalSignal, string> = {
  ok: 'bg-primary',
  warn: 'bg-[color-mix(in_oklch,var(--highlight),var(--highlight-foreground)_35%)]',
  over: 'bg-expense',
}

const rounded = computed(() => Math.round(props.width))
</script>

<template>
  <span
    :class="['block h-2 min-w-10 overflow-hidden rounded-full', TRACKS[signal]]"
    role="meter"
    data-slot="meter"
    :data-signal="signal"
    :aria-label="label"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="rounded"
  >
    <span
      :class="['block h-full rounded-full', FILLS[signal]]"
      :style="{ width: `${width}%` }"
      data-slot="meter-fill"
    />
  </span>
</template>
