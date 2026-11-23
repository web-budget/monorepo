<script setup lang="ts">
import { Banknote, Ellipsis, Eye, Pencil, Trash2, Undo2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { MovementStatus, MovementType } from '@/types'

defineProps<{ status: MovementStatus; type: MovementType; periodOpen: boolean }>()

const emit = defineEmits<{
  details: []
  pay: []
  edit: []
  undo: []
  remove: []
}>()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon-sm" :aria-label="$t('crud.actions.more')">
        <Ellipsis />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="min-w-44">
      <DropdownMenuItem @select="emit('details')">
        <Eye />{{ $t('movement.actions.details') }}
      </DropdownMenuItem>
      <template v-if="status === 'OPEN'">
        <DropdownMenuItem @select="emit('pay')">
          <Banknote />{{
            $t(type === 'INCOME' ? 'movement.actions.receive' : 'movement.actions.pay')
          }}
        </DropdownMenuItem>
        <DropdownMenuItem @select="emit('edit')">
          <Pencil />{{ $t('movement.actions.edit') }}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" @select="emit('remove')">
          <Trash2 />{{ $t('movement.actions.remove') }}
        </DropdownMenuItem>
      </template>
      <template v-else-if="periodOpen">
        <DropdownMenuSeparator />
        <DropdownMenuItem @select="emit('undo')">
          <Undo2 />{{ $t('movement.actions.undo') }}
        </DropdownMenuItem>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
