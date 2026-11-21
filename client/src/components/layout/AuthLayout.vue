<script setup lang="ts">
import AuthAside from '@/components/auth/AuthAside.vue'
import BrandMark from '@/components/brand/BrandMark.vue'
import BrandWordmark from '@/components/brand/BrandWordmark.vue'
import LanguageSwitch from '@/components/layout/LanguageSwitch.vue'
</script>

<template>
  <div
    class="bg-background text-foreground grid min-h-svh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
  >
    <AuthAside />
    <main
      class="relative grid content-start justify-items-center px-6 pt-10 pb-8 text-sm lg:content-center lg:p-10"
    >
      <div class="absolute top-4 right-4 w-36 lg:top-6 lg:right-6">
        <LanguageSwitch />
      </div>
      <div class="grid w-full max-w-[400px] gap-8">
        <div class="flex items-center gap-2.5 lg:hidden" data-slot="auth-brand">
          <BrandMark :size="28" />
          <BrandWordmark class="text-lg" />
        </div>
        <RouterView />
      </div>
    </main>
  </div>
</template>
