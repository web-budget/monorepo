<script setup lang="ts">
import { Ellipsis, Pencil, Scale, ScrollText, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

defineProps<{ adjustable: boolean }>()

const emit = defineEmits<{ statement: []; adjust: []; edit: []; remove: [] }>()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon-sm" :aria-label="$t('crud.actions.more')">
        <Ellipsis />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="min-w-44">
      <DropdownMenuItem @select="emit('statement')">
        <ScrollText />{{ $t('wallet.actions.view-statement') }}
      </DropdownMenuItem>
      <DropdownMenuItem :disabled="!adjustable" @select="emit('adjust')">
        <Scale />{{ $t('wallet.actions.adjust-balance') }}
      </DropdownMenuItem>
      <DropdownMenuItem @select="emit('edit')">
        <Pencil />{{ $t('crud.actions.edit') }}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" @select="emit('remove')">
        <Trash2 />{{ $t('crud.actions.remove') }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
