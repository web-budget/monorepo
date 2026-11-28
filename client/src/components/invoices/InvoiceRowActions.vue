<script setup lang="ts">
import { Ellipsis, Eye, FileUp, Lock, Plus } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

defineProps<{ open: boolean; closable: boolean }>()

const emit = defineEmits<{ details: []; purchase: []; import: []; close: [] }>()
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
        <Eye />{{ $t('credit-card-invoice.actions.open') }}
      </DropdownMenuItem>
      <template v-if="open">
        <DropdownMenuItem @select="emit('purchase')">
          <Plus />{{ $t('credit-card-invoice.actions.new-purchase') }}
        </DropdownMenuItem>
        <DropdownMenuItem @select="emit('import')">
          <FileUp />{{ $t('credit-card-invoice.actions.import') }}
        </DropdownMenuItem>
        <DropdownMenuItem v-if="closable" @select="emit('close')">
          <Lock />{{ $t('credit-card-invoice.actions.close') }}
        </DropdownMenuItem>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
