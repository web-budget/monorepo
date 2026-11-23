<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'

const props = defineProps<{ active: boolean; finished: boolean }>()

const status = computed(() => {
  if (props.finished) {
    return 'finished'
  }
  return props.active ? 'active' : 'inactive'
})
</script>

<template>
  <Badge :variant="status === 'active' ? 'approved' : 'neutral'">
    {{ $t(`recurrent-movement.status.${status}`) }}
  </Badge>
</template>
