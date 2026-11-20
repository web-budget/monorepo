<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'

const props = withDefaults(defineProps<{ active?: boolean; feminine?: boolean }>(), {
  active: false,
  feminine: false,
})

const label = computed(() => {
  const prefix = props.feminine ? 'status.feminine' : 'status'
  return `${prefix}.${props.active ? 'active' : 'inactive'}`
})
</script>

<template>
  <Badge variant="neutral" :class="{ 'opacity-70': !props.active }">{{ $t(label) }}</Badge>
</template>
