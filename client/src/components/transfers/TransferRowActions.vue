<script setup lang="ts">
import { Ellipsis, Eye, Undo2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

defineProps<{ returnable: boolean }>()

const emit = defineEmits<{ details: []; 'give-back': [] }>()
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
        <Eye />{{ $t('transfer.actions.details') }}
      </DropdownMenuItem>
      <DropdownMenuItem v-if="returnable" @select="emit('give-back')">
        <Undo2 />{{ $t('transfer.actions.give-back') }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
