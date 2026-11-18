<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { initials } from '@/utils/initials'

const props = defineProps<{ name?: string; class?: HTMLAttributes['class'] }>()
</script>

<template>
  <span
    aria-hidden="true"
    :class="
      cn(
        'bg-secondary text-secondary-foreground inline-grid size-8 shrink-0 place-content-center rounded-md font-mono text-xs font-medium',
        props.class,
      )
    "
  >
    {{ initials(props.name) }}
  </span>
</template>
