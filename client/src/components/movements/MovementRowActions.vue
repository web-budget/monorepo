<script setup lang="ts">
import { Ellipsis, Eye, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { MovementStatus } from '@/types'

defineProps<{ status: MovementStatus }>()

const emit = defineEmits<{ details: []; remove: [] }>()
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
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" @select="emit('remove')">
          <Trash2 />{{ $t('movement.actions.remove') }}
        </DropdownMenuItem>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
