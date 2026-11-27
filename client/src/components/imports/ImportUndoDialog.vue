<script setup lang="ts">
import { Undo2 } from 'lucide-vue-next'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ImportView } from '@/types'

const props = defineProps<{
  open: boolean
  item: ImportView
  messages: string[]
  loading: boolean
}>()

defineEmits<{ close: []; confirm: [] }>()

const { t } = useI18n()

const effects = computed(() => {
  const { result, target } = props.item
  const card = target === 'CARD'
  const prefix = `imports.saved.undo.${card ? 'card' : 'wallet'}`
  const extra = card ? result.recurring : result.transfers
  return [
    t(`${prefix}.created`, result.created),
    t(`${prefix}.linked`, result.linked),
    ...(extra > 0 ? [t(`${prefix}.extra`, extra)] : []),
    ...(card ? [] : [t(`${prefix}.note`)]),
  ]
})
</script>

<template>
  <Dialog :open="open" @update:open="$emit('close')">
    <DialogContent class="sm:max-w-lg" data-slot="undo-dialog">
      <DialogHeader>
        <DialogTitle>{{ $t('imports.saved.undo.title', { file: item.fileName }) }}</DialogTitle>
        <DialogDescription class="sr-only">{{ $t('imports.saved.undo.title', { file: item.fileName }) }}</DialogDescription>
      </DialogHeader>
      <ul class="text-muted-foreground grid list-disc gap-1 pl-5 text-sm" data-slot="undo-effects">
        <li v-for="effect in effects" :key="effect">{{ effect }}</li>
      </ul>
      <ServerErrorAlert :messages="messages" />
      <DialogFooter>
        <Button type="button" variant="outline" @mousedown.prevent @click="$emit('close')">
          {{ $t('form.cancel') }}
        </Button>
        <Button type="button" :disabled="loading" @click="$emit('confirm')">
          <Undo2 />{{ $t('imports.saved.undo.confirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
