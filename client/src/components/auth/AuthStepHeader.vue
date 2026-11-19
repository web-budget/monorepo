<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <div class="grid gap-1.5" data-slot="auth-step-header">
    <h1 class="text-2xl font-semibold tracking-tight">{{ title }}</h1>
    <p v-if="$slots.default" class="text-muted-foreground"><slot /></p>
  </div>
</template>
