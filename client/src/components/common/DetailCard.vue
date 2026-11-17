<script setup lang="ts">
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import StatusBadge from '@/components/listing/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

defineProps<{ title: string; active?: boolean; messages: string[] }>()

const emit = defineEmits<{ back: []; edit: []; delete: [] }>()
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ title }}</CardTitle>
    </CardHeader>
    <CardContent class="space-y-6">
      <ServerErrorAlert :messages="messages" />
      <StatusBadge v-if="active !== undefined" :active="active" />
      <dl class="grid gap-4 md:grid-cols-2">
        <slot />
      </dl>
    </CardContent>
    <CardFooter class="mt-6 justify-end gap-2">
      <Button type="button" variant="outline" @click="emit('back')">{{ $t('form.back') }}</Button>
      <Button type="button" @click="emit('edit')">{{ $t('form.edit') }}</Button>
      <Button type="button" variant="destructive" @click="emit('delete')">
        {{ $t('form.delete') }}
      </Button>
    </CardFooter>
  </Card>
</template>
