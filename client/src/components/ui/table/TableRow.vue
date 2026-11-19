<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <tr
    data-slot="table-row"
    :class="
      cn(
        'hover:bg-muted/60 data-[state=selected]:[&>td:first-child]:shadow-[inset_3px_0_0_var(--highlight)] border-b transition-colors',
        props.class,
      )
    "
  >
    <slot />
  </tr>
</template>
