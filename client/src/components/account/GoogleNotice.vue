<script setup lang="ts">
import { KeyRound } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div
    class="border-border bg-muted grid gap-2 rounded-md border px-4 py-3 text-sm"
    data-slot="google-notice"
  >
    <span class="flex items-center gap-2 font-medium">
      <KeyRound class="text-muted-foreground size-4" />
      {{ $t('account.google.title') }}
    </span>
    <span class="text-muted-foreground">
      {{ $t('account.google.description', { email: auth.session?.email }) }}
    </span>
  </div>
</template>
