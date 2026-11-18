<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{ icon: Component; tone: 'accent' | 'attention' | 'success' | 'danger' }>()

const TONES = {
  accent: 'bg-accent text-accent-foreground',
  attention: 'bg-highlight text-highlight-foreground',
  success: 'bg-income-muted text-income',
  danger: 'bg-expense-muted text-expense',
}
</script>

<template>
  <span
    data-slot="auth-status-icon"
    class="grid size-11 place-content-center rounded-md [&_svg]:size-5"
    :class="TONES[tone]"
  >
    <component :is="icon" />
  </span>
</template>
