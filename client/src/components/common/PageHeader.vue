<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <div class="flex flex-wrap items-start justify-between gap-4">
    <div class="grid min-w-0 gap-1.5">
      <div class="flex min-w-0 items-center gap-2.5">
        <h1
          class="text-2xl leading-9 font-semibold tracking-tight break-words"
          data-slot="page-title"
        >
          {{ title }}
        </h1>
        <slot name="badge" />
      </div>
      <p v-if="description" class="text-muted-foreground text-sm" data-slot="page-description">
        {{ description }}
      </p>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap gap-2" data-slot="page-actions">
      <slot name="actions" />
    </div>
  </div>
</template>
