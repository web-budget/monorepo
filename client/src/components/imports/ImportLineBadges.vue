<script setup lang="ts">
import { CopyCheck, History, Link2, TriangleAlert } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'
import type { ImportLineView } from '@/types'
import { fileDifference } from '@/utils/imports'

defineProps<{ line: ImportLineView }>()

const { n } = useI18n()

function difference(line: ImportLineView): string {
  const value = fileDifference(line)
  const formatted = n(Math.abs(value), 'currency')
  return value < 0 ? `−${formatted}` : formatted
}
</script>

<template>
  <span class="inline-flex flex-wrap items-center gap-1.5" data-slot="line-badges">
    <span
      v-if="line.fromMemory"
      class="text-muted-foreground inline-flex shrink-0"
      :title="$t('imports.draft.memory')"
      data-slot="line-memory"
    >
      <History class="size-3.5" />
      <span class="sr-only">{{ $t('imports.draft.memory') }}</span>
    </span>
    <Badge v-if="line.alreadyImported" variant="neutral">
      <CopyCheck />{{ $t('imports.draft.badges.already-imported') }}
    </Badge>
    <Badge v-if="line.alreadyRegistered" variant="neutral">
      <Link2 />{{ $t('imports.draft.badges.already-registered') }}
    </Badge>
    <Badge v-if="line.ignoreReason?.code === 'credit'" variant="pending">
      <TriangleAlert />{{ $t('imports.draft.badges.credit') }}
    </Badge>
    <Badge v-if="line.installment && line.installments" variant="outline">
      {{ line.installment }}/{{ line.installments }}
    </Badge>
    <Badge v-if="line.differentValue" variant="pending">
      <TriangleAlert />{{ $t('imports.draft.badges.difference', { value: difference(line) }) }}
    </Badge>
  </span>
</template>
