<script setup lang="ts">
import type { StatusOption } from '@/components/listing/statusOptions'

defineProps<{
  status: string
  options: StatusOption[]
  counts?: Record<string, number | null | undefined>
}>()

const emit = defineEmits<{ select: [status: string] }>()
</script>

<template>
  <div
    class="bg-muted inline-flex h-9 items-center gap-0.5 rounded-md p-1 max-md:w-full max-md:overflow-x-auto max-md:[scrollbar-width:none]"
    role="group"
    :aria-label="$t('search-control.status')"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="status === option.value"
      class="text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs inline-flex h-7 items-center justify-center gap-1.5 whitespace-nowrap rounded-sm px-3 text-sm font-medium transition-colors max-md:flex-1 max-md:gap-1 max-md:px-1.5 max-md:text-[13px]"
      @click="emit('select', option.value)"
    >
      {{ $t(option.label) }}
      <span
        v-if="counts?.[option.value] != null"
        class="font-mono text-xs tabular-nums"
        data-slot="status-count"
      >
        {{ counts[option.value] }}
      </span>
    </button>
  </div>
</template>
