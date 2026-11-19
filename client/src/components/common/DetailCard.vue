<script setup lang="ts">
import { Pencil, Trash2 } from 'lucide-vue-next'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import StatusBadge from '@/components/listing/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

defineProps<{ title: string; description?: string; active?: boolean; messages: string[] }>()

const emit = defineEmits<{ edit: []; delete: [] }>()
</script>

<template>
  <PageContainer class="mt-4 grid gap-5">
    <PageHeader :title="title" :description="description">
      <template #badge>
        <slot name="badge">
          <StatusBadge v-if="active !== undefined" :active="active" />
        </slot>
      </template>
      <template #actions>
        <Button
          type="button"
          variant="outline"
          class="text-destructive hover:text-destructive"
          @click="emit('delete')"
        >
          <Trash2 />{{ $t('crud.actions.remove') }}
        </Button>
        <Button type="button" @click="emit('edit')">
          <Pencil />{{ $t('crud.actions.edit') }}
        </Button>
      </template>
    </PageHeader>
    <ServerErrorAlert :messages="messages" />
    <Card class="gap-0 py-0">
      <slot />
    </Card>
  </PageContainer>
</template>
