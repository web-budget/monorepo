<script setup lang="ts">
defineProps<{ label: string; value?: string | number | null }>()
</script>

<template>
  <div class="space-y-1">
    <dt class="text-muted-foreground text-sm">{{ label }}</dt>
    <dd class="text-sm font-medium">
      <slot>{{ value === undefined || value === null || value === '' ? '---' : value }}</slot>
    </dd>
  </div>
</template>
