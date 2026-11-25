<script setup lang="ts">
import { Badge } from '@/components/ui/badge'

defineProps<{ ended: boolean }>()
</script>

<template>
  <Badge variant="neutral" :class="ended && 'opacity-70'">
    {{ $t(ended ? 'recurrent-movement.status.ended' : 'recurrent-movement.status.active') }}
  </Badge>
</template>
