<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ImportCandidateView } from '@/types'
import { periodMonth } from '@/utils/invoices'

defineProps<{ open: boolean; items: ImportCandidateView[] }>()

defineEmits<{ close: [] }>()

const { t } = useI18n()

function describe(item: ImportCandidateView): string {
  return [t('imports.draft.recurring.open'), item.financialPeriod && periodMonth(item.financialPeriod.name)]
    .filter(Boolean)
    .join(', ')
}
</script>

<template>
  <Dialog :open="open" @update:open="$emit('close')">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ $t('imports.draft.recurring.title') }}</DialogTitle>
        <DialogDescription class="sr-only">
          {{ $t('imports.draft.recurring.alert', items.length) }}
        </DialogDescription>
      </DialogHeader>
      <ul class="divide-border divide-y text-sm" data-slot="unlinked-list">
        <li
          v-for="item in items"
          :key="item.id"
          class="flex items-baseline justify-between gap-4 py-2"
        >
          <span class="grid">
            <span class="font-medium">{{ item.name }}</span>
            <span class="text-muted-foreground text-xs">{{ describe(item) }}</span>
          </span>
          <CurrencyDisplay :value="item.value" />
        </li>
      </ul>
      <DialogFooter>
        <Button type="button" variant="outline" @click="$emit('close')">
          {{ $t('imports.draft.close') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
