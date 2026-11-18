<script setup lang="ts">
import BrandMark from '@/components/brand/BrandMark.vue'
import BrandWordmark from '@/components/brand/BrandWordmark.vue'
</script>

<template>
  <div class="bg-muted flex min-h-screen items-center justify-center p-4">
    <div class="bg-card w-full max-w-md rounded-lg border px-8 py-10">
      <div class="mb-8 flex items-center justify-center gap-2.5 text-2xl">
        <BrandMark :size="32" />
        <BrandWordmark />
      </div>
      <RouterView />
    </div>
  </div>
</template>
