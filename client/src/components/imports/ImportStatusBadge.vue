<script setup lang="ts">
import { CircleAlert, ListChecks, LoaderCircle, Undo2 } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import type { ImportStatus } from '@/types'

const VARIANTS = {
  PROCESSING: 'neutral',
  READY: 'pending',
  FAILED: 'blocked',
  SAVED: 'approved',
  UNDONE: 'outline',
} as const

const ICONS = {
  PROCESSING: LoaderCircle,
  READY: ListChecks,
  FAILED: CircleAlert,
  UNDONE: Undo2,
} as const

defineProps<{ status: ImportStatus }>()
</script>

<template>
  <Badge :variant="VARIANTS[status]" data-slot="import-status">
    <component :is="ICONS[status as keyof typeof ICONS]" v-if="status in ICONS" class="size-3" />
    {{ $t(`imports.status.${status}`) }}
  </Badge>
</template>
