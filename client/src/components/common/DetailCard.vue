<script setup lang="ts">
import { Pencil, Trash2 } from 'lucide-vue-next'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import StatusBadge from '@/components/listing/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    active?: boolean
    feminineStatus?: boolean
    messages: string[]
    readonly?: boolean
    hideEdit?: boolean
    editVariant?: 'default' | 'outline'
  }>(),
  { active: undefined, editVariant: 'default' },
)

const emit = defineEmits<{ edit: []; delete: [] }>()
</script>

<template>
  <PageContainer>
    <PageHeader :title="title" :description="description">
      <template #badge>
        <slot name="badge">
          <StatusBadge v-if="active !== undefined" :active="active" :feminine="feminineStatus" />
        </slot>
      </template>
      <template v-if="!readonly || $slots['extra-actions']" #actions>
        <Button
          v-if="!readonly"
          type="button"
          variant="outline"
          class="text-destructive hover:text-destructive"
          @click="emit('delete')"
        >
          <Trash2 />{{ $t('crud.actions.remove') }}
        </Button>
        <Button
          v-if="!readonly && !hideEdit"
          type="button"
          :variant="props.editVariant"
          @click="emit('edit')"
        >
          <Pencil />{{ $t('crud.actions.edit') }}
        </Button>
        <slot name="extra-actions" />
      </template>
    </PageHeader>
    <ServerErrorAlert :messages="messages" />
    <slot name="notice" />
    <Card class="gap-0 py-0">
      <slot />
      <div
        v-if="$slots.footer"
        class="bg-muted flex flex-wrap items-center justify-end gap-2 rounded-b-lg px-5 py-3"
        data-slot="detail-footer"
      >
        <slot name="footer" />
      </div>
    </Card>
  </PageContainer>
</template>
