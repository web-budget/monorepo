<script setup lang="ts">
import { Info, Undo2 } from 'lucide-vue-next'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { MovementView } from '@/types'

const props = defineProps<{ movement: MovementView | null; loading: boolean }>()

const emit = defineEmits<{ close: []; confirm: [movement: MovementView] }>()

const { t, n } = useI18n()

const card = computed(() => props.movement?.payment?.card ?? null)
const wallet = computed(() => props.movement?.payment?.wallet ?? null)
const reversal = computed(() => {
  const paid = props.movement?.payment?.valuePaid ?? 0
  const sign = props.movement?.type === 'INCOME' ? '−' : '+'
  return `${sign}${n(paid, 'currency')}`
})
</script>

<template>
  <Dialog :open="movement !== null" @update:open="emit('close')">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t('movement.undo.title', { name: movement?.name }) }}</DialogTitle>
        <DialogDescription>
          {{
            card
              ? t('movement.undo.description-card', { card: card.name })
              : t('movement.undo.description-wallet', { wallet: wallet?.name })
          }}
        </DialogDescription>
      </DialogHeader>
      <Alert data-slot="reversal">
        <Info />
        <AlertTitle>{{ t('movement.undo.reversal', { amount: reversal }) }}</AlertTitle>
      </Alert>
      <DialogFooter>
        <Button type="button" variant="outline" @click="emit('close')">
          {{ t('form.cancel') }}
        </Button>
        <Button
          type="button"
          variant="destructive"
          :disabled="loading"
          @click="emit('confirm', movement as MovementView)"
        >
          <Undo2 />{{ t('movement.undo.confirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
