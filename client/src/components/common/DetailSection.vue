<script setup lang="ts">
import { cn } from '@/lib/utils'

withDefaults(defineProps<{ title: string; columns?: string }>(), { columns: 'md:grid-cols-2' })
</script>

<template>
  <section
    class="grid gap-3 border-b p-5 last:border-b-0 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8"
  >
    <h2 class="text-sm font-semibold">{{ title }}</h2>
    <dl :class="cn('grid grid-cols-1 gap-x-6 gap-y-4', columns)">
      <slot />
    </dl>
  </section>
</template>
