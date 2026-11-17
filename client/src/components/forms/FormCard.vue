<script setup lang="ts">
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

defineProps<{ title: string; loading: boolean; messages: string[] }>()

const emit = defineEmits<{ submit: []; back: [] }>()
</script>

<template>
  <Card>
    <form class="flex flex-col gap-6" novalidate @submit.prevent="emit('submit')">
      <CardHeader>
        <CardTitle>{{ title }}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-6">
        <ServerErrorAlert :messages="messages" />
        <slot />
      </CardContent>
      <CardFooter class="justify-end gap-2">
        <Button type="button" variant="outline" :disabled="loading" @click="emit('back')">
          {{ $t('form.back') }}
        </Button>
        <Button type="submit" :disabled="loading">{{ $t('form.save') }}</Button>
      </CardFooter>
    </form>
  </Card>
</template>
