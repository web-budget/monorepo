<script setup lang="ts">
import { CircleAlert } from 'lucide-vue-next'

defineProps<{ messages: string[] }>()
</script>

<template>
  <div
    v-if="messages.length > 0"
    role="alert"
    data-slot="server-error"
    class="border-destructive/50 text-destructive flex items-start gap-2 rounded-md border p-3 text-sm"
  >
    <CircleAlert class="mt-0.5 size-4 shrink-0" />
    <ul class="space-y-1">
      <li v-for="message in messages" :key="message">{{ message }}</li>
    </ul>
  </div>
</template>
