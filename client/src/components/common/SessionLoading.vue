<script setup lang="ts">
import BrandMark from '@/components/brand/BrandMark.vue'
</script>

<template>
  <div
    role="status"
    :aria-label="$t('layout.loading')"
    class="bg-background fixed inset-0 z-50 flex items-center justify-center"
  >
    <BrandMark :size="40" class="animate-pulse" />
  </div>
</template>
