<script setup lang="ts">
import { Ellipsis, Eye, Pencil, Trash2, TrendingUp } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { RecurringValueKind } from '@/types'

defineProps<{ valueKind: RecurringValueKind }>()

const emit = defineEmits<{ details: []; edit: []; readjust: []; remove: [] }>()
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
        <Eye />{{ $t('recurrent-movement.actions.details') }}
      </DropdownMenuItem>
      <DropdownMenuItem @select="emit('edit')">
        <Pencil />{{ $t('recurrent-movement.actions.edit') }}
      </DropdownMenuItem>
      <DropdownMenuItem v-if="valueKind === 'FIXED'" @select="emit('readjust')">
        <TrendingUp />{{ $t('recurrent-movement.actions.readjust') }}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" @select="emit('remove')">
        <Trash2 />{{ $t('recurrent-movement.actions.remove') }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
