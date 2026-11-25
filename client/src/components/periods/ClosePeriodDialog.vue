<script setup lang="ts">
import { Lock } from 'lucide-vue-next'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
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
import type { FinancialPeriodResultView } from '@/types'

withDefaults(
  defineProps<{
    open: boolean
    name: string
    result: FinancialPeriodResultView | null
    loading: boolean
    messages?: string[]
  }>(),
  { messages: () => [] },
)

const emit = defineEmits<{ close: []; confirm: [] }>()
</script>

<template>
  <Dialog :open="open" @update:open="emit('close')">
    <DialogContent class="sm:max-w-md">
      <div class="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{{ $t('period-closing.close.title', { name }) }}</DialogTitle>
          <DialogDescription>{{ $t('period-closing.close.description') }}</DialogDescription>
        </DialogHeader>
        <ServerErrorAlert :messages="messages" />
        <dl
          v-if="result"
          class="bg-muted grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-md p-3 text-sm"
          data-slot="close-summary"
        >
          <dt class="text-muted-foreground">{{ $t('financial-period.result.revenues') }}</dt>
          <dd class="text-right">
            <CurrencyDisplay :value="result.revenues" tone="income" bare />
          </dd>
          <dt class="text-muted-foreground">{{ $t('financial-period.result.expenses') }}</dt>
          <dd class="text-right">
            <CurrencyDisplay :value="result.expenses" tone="expense" bare />
          </dd>
          <dt class="font-medium">{{ $t('financial-period.result.result') }}</dt>
          <dd class="text-right">
            <CurrencyDisplay
              :value="result.result"
              :signed="result.result < 0"
              glued
              bare
              class="font-semibold"
            />
          </dd>
        </dl>
        <DialogFooter>
          <Button type="button" variant="outline" @click="emit('close')">
            {{ $t('form.cancel') }}
          </Button>
          <Button type="button" :disabled="loading" @click="emit('confirm')">
            <Lock />{{ $t('period-closing.close.confirm') }}
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
</template>
