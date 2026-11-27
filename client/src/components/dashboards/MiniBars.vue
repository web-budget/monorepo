<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

export interface MiniBar {
  label: string
  value: number
}

const props = defineProps<{ bars: MiniBar[]; description: string }>()

const { n } = useI18n()

const maximum = computed(() => Math.max(...props.bars.map((bar) => bar.value), 0))

function height(bar: MiniBar): number {
  return maximum.value > 0 ? Math.max(8, (bar.value / maximum.value) * 100) : 8
}

function title(bar: MiniBar): string {
  return `${bar.label} · ${n(bar.value, 'currency')}`
}
</script>

<template>
  <span
    class="flex h-8 items-end gap-0.5"
    role="img"
    :aria-label="description"
    data-slot="mini-bars"
  >
    <span
      v-for="(bar, index) in bars"
      :key="bar.label"
      :class="[
        'w-2 rounded-t-[2px]',
        index === bars.length - 1
          ? 'bg-chart-1'
          : 'bg-[color-mix(in_oklch,var(--chart-1)_35%,var(--card))]',
        bar.value === 0 && 'opacity-40',
      ]"
      :style="{ height: `${height(bar)}%` }"
      :title="title(bar)"
      data-slot="mini-bar"
    />
  </span>
</template>
