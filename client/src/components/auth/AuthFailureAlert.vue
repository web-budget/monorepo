<script setup lang="ts">
import { CircleAlert, Timer } from 'lucide-vue-next'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

defineProps<{ title: string; description: string; rateLimit?: boolean }>()
</script>

<template>
  <Alert variant="destructive" data-slot="step-failure">
    <Timer v-if="rateLimit" />
    <CircleAlert v-else />
    <AlertTitle>{{ title }}</AlertTitle>
    <AlertDescription>{{ description }}</AlertDescription>
  </Alert>
</template>
