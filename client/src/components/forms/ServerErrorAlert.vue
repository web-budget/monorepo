<script setup lang="ts">
import { CircleAlert } from 'lucide-vue-next'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SERVER_ERROR_ALERT_ID } from '@/components/ui/form'

defineProps<{ messages: string[] }>()
</script>

<template>
  <Alert
    v-if="messages.length > 0"
    :id="SERVER_ERROR_ALERT_ID"
    variant="destructive"
    data-slot="server-error"
  >
    <CircleAlert />
    <AlertDescription class="text-foreground">
      <ul class="space-y-1">
        <li v-for="message in messages" :key="message">{{ message }}</li>
      </ul>
    </AlertDescription>
  </Alert>
</template>
