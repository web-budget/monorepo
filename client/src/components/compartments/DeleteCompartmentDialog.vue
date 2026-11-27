<script setup lang="ts">
import { ArrowUpFromLine, Trash2 } from 'lucide-vue-next'
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
import type { CompartmentView } from '@/types'

const props = defineProps<{
  compartment: CompartmentView | null
  walletName: string
  loading: boolean
  messages: string[]
}>()

const emit = defineEmits<{ close: []; confirm: []; withdrawAll: [] }>()

const { n } = useI18n()

const hasBalance = computed(() => (props.compartment?.balance ?? 0) !== 0)
const amount = computed(() => n(props.compartment?.balance ?? 0, 'currency'))
</script>

<template>
  <Dialog :open="compartment !== null" @update:open="emit('close')">
    <DialogContent class="sm:max-w-md">
      <DialogHeader v-if="hasBalance">
        <DialogTitle>
          {{ $t('compartment.remove.balance-title', { name: compartment?.name, amount }) }}
        </DialogTitle>
        <DialogDescription>{{ $t('compartment.remove.balance-description') }}</DialogDescription>
      </DialogHeader>
      <DialogHeader v-else>
        <DialogTitle>{{ $t('compartment.remove.title', { name: compartment?.name }) }}</DialogTitle>
        <DialogDescription v-if="(compartment?.statementEntryCount ?? 0) > 0">
          {{
            $t(
              'compartment.remove.description',
              { count: compartment?.statementEntryCount },
              compartment?.statementEntryCount ?? 0,
            )
          }}
        </DialogDescription>
        <DialogDescription v-else class="sr-only">{{ walletName }}</DialogDescription>
      </DialogHeader>
      <ServerErrorAlert :messages="messages" />
      <DialogFooter>
        <Button type="button" variant="outline" @mousedown.prevent @click="emit('close')">
          {{ hasBalance ? $t('compartment.remove.close') : $t('form.cancel') }}
        </Button>
        <Button v-if="hasBalance" type="button" @click="emit('withdrawAll')">
          <ArrowUpFromLine />{{ $t('compartment.remove.withdraw-all') }}
        </Button>
        <Button
          v-else
          type="button"
          variant="destructive"
          :disabled="loading"
          @click="emit('confirm')"
        >
          <Trash2 />{{ $t('compartment.remove.confirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
