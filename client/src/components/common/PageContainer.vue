<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div :class="cn('grid grid-cols-1 gap-5 *:min-w-0', props.class)">
    <slot />
  </div>
</template>
