<script setup lang="ts">
import { cn } from '@/lib/utils'

withDefaults(
  defineProps<{ title: string; description?: string; columns?: string; conditional?: boolean }>(),
  { description: undefined, columns: 'md:grid-cols-2', conditional: false },
)
</script>

<template>
  <section
    :class="
      cn(
        'grid gap-4 border-b p-5 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8',
        conditional && 'bg-accent/35',
      )
    "
  >
    <div class="grid content-start gap-1">
      <h2 class="text-sm font-semibold">{{ title }}</h2>
      <p v-if="description" class="text-muted-foreground text-xs">{{ description }}</p>
    </div>
    <div :class="cn('grid grid-cols-1 gap-4', columns)">
      <slot />
    </div>
  </section>
</template>
