<script setup lang="ts">
import { Lock } from 'lucide-vue-next'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
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

defineProps<{
  open: boolean
  title: string
  purchases: number
  value: number
  dueDate: string | null
  walletName: string | null
  loading: boolean
  messages: string[]
}>()

const emit = defineEmits<{ close: []; confirm: [] }>()
</script>

<template>
  <Dialog :open="open" @update:open="emit('close')">
    <DialogContent class="sm:max-w-lg" :show-close-button="false">
      <div class="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{{ title }}</DialogTitle>
          <DialogDescription>
            {{
              $t(
                purchases > 0
                  ? 'credit-card-invoice.close.description'
                  : 'credit-card-invoice.close.description-empty',
              )
            }}
          </DialogDescription>
        </DialogHeader>
        <ServerErrorAlert :messages="messages" />
        <dl class="bg-muted grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-md p-3 text-sm">
          <dt class="text-muted-foreground">{{ $t('credit-card-invoice.close.purchases') }}</dt>
          <dd class="text-right font-mono">{{ purchases }}</dd>
          <dt class="text-muted-foreground">{{ $t('credit-card-invoice.close.payment') }}</dt>
          <dd class="text-right"><CurrencyDisplay :value="value" bare /></dd>
          <template v-if="dueDate">
            <dt class="text-muted-foreground">{{ $t('credit-card-invoice.close.due-date') }}</dt>
            <dd class="text-right font-mono"><DateTimeDisplay fix-time :value="dueDate" /></dd>
          </template>
          <template v-if="walletName">
            <dt class="text-muted-foreground">{{ $t('credit-card-invoice.close.wallet') }}</dt>
            <dd class="text-right">{{ walletName }}</dd>
          </template>
        </dl>
        <p class="text-muted-foreground text-xs">{{ $t('credit-card-invoice.close.help') }}</p>
        <DialogFooter>
          <Button type="button" variant="outline" @click="emit('close')">
            {{ $t('form.cancel') }}
          </Button>
          <Button type="button" :disabled="loading" @click="emit('confirm')">
            <Lock />{{ $t('credit-card-invoice.close.confirm') }}
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
</template>
