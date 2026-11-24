<script setup lang="ts">
import { CreditCard, Ellipsis, Pencil, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const emit = defineEmits<{ edit: []; invoices: []; remove: [] }>()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon-sm" :aria-label="$t('crud.actions.more')">
        <Ellipsis />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="min-w-44">
      <DropdownMenuItem @select="emit('edit')">
        <Pencil />{{ $t('crud.actions.edit') }}
      </DropdownMenuItem>
      <DropdownMenuItem @select="emit('invoices')">
        <CreditCard />{{ $t('card.actions.view-invoices') }}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" @select="emit('remove')">
        <Trash2 />{{ $t('crud.actions.remove') }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
