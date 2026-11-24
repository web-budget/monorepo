<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import type { RecurringValueKind } from '@/types'

defineProps<{ valueKind: RecurringValueKind }>()
</script>

<template>
  <Badge :variant="valueKind === 'FIXED' ? 'neutral' : 'highlight'">
    {{ $t(`recurrent-movement.value-kind.${valueKind}`) }}
  </Badge>
</template>
