<script setup lang="ts">
import { Check, Info, LockOpen } from 'lucide-vue-next'
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const props = defineProps<{ period: { name: string } | null; loading: boolean }>()

const emit = defineEmits<{ close: []; confirm: [] }>()

const shown = ref(props.period)

watch(
  () => props.period,
  (period) => {
    if (period) {
      shown.value = period
    }
  },
)

const effects = [
  { key: 'erases-result', icon: Check, tone: 'text-income' },
  { key: 'unfreezes', icon: Check, tone: 'text-income' },
  { key: 'invoices-closed-by-hand', icon: Info, tone: 'text-muted-foreground' },
  { key: 'empty-invoices', icon: Info, tone: 'text-muted-foreground' },
]
</script>

<template>
  <Dialog :open="period !== null" @update:open="emit('close')">
    <DialogContent class="sm:max-w-md">
      <div class="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{{ $t('period-closing.reopen.title', { name: shown?.name }) }}</DialogTitle>
          <DialogDescription>{{ $t('period-closing.reopen.description') }}</DialogDescription>
        </DialogHeader>
        <ul class="grid gap-2 text-sm" data-slot="reopen-effects">
          <li v-for="effect in effects" :key="effect.key" class="flex gap-2">
            <component :is="effect.icon" :class="['mt-0.5 size-4 shrink-0', effect.tone]" />
            <span>{{ $t(`period-closing.reopen.${effect.key}`) }}</span>
          </li>
        </ul>
        <DialogFooter>
          <Button type="button" variant="outline" @click="emit('close')">
            {{ $t('form.cancel') }}
          </Button>
          <Button type="button" :disabled="loading" @click="emit('confirm')">
            <LockOpen />{{ $t('period-closing.reopen.confirm') }}
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
</template>
