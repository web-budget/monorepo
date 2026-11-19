<script setup lang="ts">
import { Ellipsis, Pencil, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const emit = defineEmits<{ onEdit: []; onDelete: [] }>()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon-sm" :aria-label="$t('crud.actions.more')">
        <Ellipsis />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="min-w-40">
      <DropdownMenuItem @select="emit('onEdit')">
        <Pencil />{{ $t('crud.actions.edit') }}
      </DropdownMenuItem>
      <DropdownMenuItem variant="destructive" @select="emit('onDelete')">
        <Trash2 />{{ $t('crud.actions.remove') }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
