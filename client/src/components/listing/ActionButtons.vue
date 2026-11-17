<script setup lang="ts">
import { Pencil, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const emit = defineEmits<{ onEdit: []; onDelete: [] }>()
</script>

<template>
  <TooltipProvider :delay-duration="700">
    <div class="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button size="icon" :aria-label="$t('action-button.edit')" @click.stop="emit('onEdit')">
            <Pencil />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">{{ $t('action-button.edit') }}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            size="icon"
            variant="destructive"
            :aria-label="$t('action-button.delete')"
            @click.stop="emit('onDelete')"
          >
            <Trash2 />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{{ $t('action-button.delete') }}</TooltipContent>
      </Tooltip>
    </div>
  </TooltipProvider>
</template>
