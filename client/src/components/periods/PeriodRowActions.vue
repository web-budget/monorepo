<script setup lang="ts">
import { Ellipsis, Lock, LockOpen, Pencil, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { FinancialPeriodStatus } from '@/types'

defineProps<{ status: FinancialPeriodStatus; reopenable: boolean }>()

const emit = defineEmits<{ close: []; edit: []; remove: []; reopen: [] }>()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon-sm" :aria-label="$t('crud.actions.more')">
        <Ellipsis />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="min-w-52">
      <template v-if="status === 'OPEN'">
        <DropdownMenuItem @select="emit('close')">
          <Lock />{{ $t('period-closing.actions.close') }}
        </DropdownMenuItem>
        <DropdownMenuItem @select="emit('edit')">
          <Pencil />{{ $t('crud.actions.edit') }}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" @select="emit('remove')">
          <Trash2 />{{ $t('crud.actions.remove') }}
        </DropdownMenuItem>
      </template>
      <DropdownMenuItem
        v-else
        :disabled="!reopenable"
        :title="reopenable ? undefined : $t('period-closing.reopen.only-last')"
        @select="emit('reopen')"
      >
        <LockOpen />{{ $t('period-closing.actions.reopen') }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
