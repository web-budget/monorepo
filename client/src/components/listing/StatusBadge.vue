<script setup lang="ts">
import { Badge } from '@/components/ui/badge'

const props = withDefaults(defineProps<{ active?: boolean }>(), { active: false })
</script>

<template>
  <Badge variant="neutral" :class="{ 'opacity-70': !props.active }">
    {{ props.active ? $t('status.active') : $t('status.inactive') }}
  </Badge>
</template>
