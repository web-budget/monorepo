<script setup lang="ts">
defineProps<{
  label: string
  value?: string | number | null
  mono?: boolean
  wide?: boolean
}>()
</script>

<template>
  <div :class="['min-w-0', wide && 'col-span-full']">
    <dt class="text-muted-foreground mb-0.5 text-xs">{{ label }}</dt>
    <dd :class="['text-sm break-words', mono && 'font-mono tabular-nums']">
      <slot>{{ value === undefined || value === null || value === '' ? '---' : value }}</slot>
    </dd>
  </div>
</template>
